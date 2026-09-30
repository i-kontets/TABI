<?php
declare(strict_types=1);

/**
 * 管理APIの共通認可とお知らせ処理を担当します。セッションID→固定メールと既存権限→操作可否の順に確認します。
 * 管理権限はDBのadmin_usersから読み、メール入力やクライアント保存値では付与しません。
 */
require_once __DIR__ . '/../../auth/AdminAccess.php';
require_once __DIR__ . '/../../Notifications/Service/NotificationRepository.php';

// 管理者IDを入力から受け取らず、既存ログインセッションとDBの権限を照合します。
function noticeRequireAdmin(PDO $pdo, bool $write): int
{
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    if ($userId < 1) respond(['success' => false, 'message' => 'ログインが必要です。'], 401);
    // ログインと同じ条件を各管理APIでも照合し、URL直打ちを防ぎます。
    $level = tabiAdminLevel($pdo, $userId);
    if ($level < ($write ? 5 : 1)) respond(['success' => false, 'message' => 'この操作を行う管理者権限がありません。'], 403);
    if ($write) {
        // JSON以外の書き込みを拒否し、ブラウザの別サイトからの送信も拒否します。
        $source = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
        $host = parse_url($source, PHP_URL_HOST);
        $ownHost = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
        if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site' || ($source !== '' && $host !== $ownHost)) {
            respond(['success' => false, 'message' => '許可されていない送信元です。'], 403);
        }
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'DELETE' && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
            respond(['success' => false, 'message' => 'JSON形式で送信してください。'], 415);
        }
    }
    return $userId;
}

// 日付の自動補正（2月30日など）を許さず、日本時間で検証してDB形式にそろえます。
function noticeDate($raw): ?string
{
    if ($raw === null || $raw === '') return null;
    if (!is_string($raw)) throw new InvalidArgumentException('公開日時が正しくありません。');
    $value = str_replace(['/', 'T'], ['-', ' '], trim($raw));
    foreach (['!Y-m-d H:i', '!Y-m-d H:i:s'] as $format) {
        $date = DateTimeImmutable::createFromFormat($format, $value, new DateTimeZone('Asia/Tokyo'));
        $errors = DateTimeImmutable::getLastErrors();
        if ($date && (!$errors || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))) return $date->format('Y-m-d H:i:s');
    }
    throw new InvalidArgumentException('公開日時が正しくありません。');
}

function noticeValidate(array $input): array
{
    // 通知本体の既存上限に合わせ、文字列以外や制御文字を保存前に拒否します。
    foreach (['title' => 150, 'body' => 1000] as $key => $max) {
        $value = $input[$key] ?? null;
        if (!is_string($value) || trim($value) === '' || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value)
            || preg_match_all('/./us', $value) > $max) throw new InvalidArgumentException('タイトルは150文字以内、本文は1000文字以内で入力してください。');
        $input[$key] = trim($value);
    }
    if (!in_array($input['target'] ?? null, ['全ユーザー', '特定ユーザー', '特定グループ'], true)) throw new InvalidArgumentException('通知対象が正しくありません。');
    $targetId = $input['target'] === '全ユーザー' ? null : filter_var($input['targetId'] ?? null, FILTER_VALIDATE_INT);
    if ($input['target'] !== '全ユーザー' && (!$targetId || $targetId < 1)) throw new InvalidArgumentException('対象のIDを指定してください。');
    if (!is_bool($input['push'] ?? null)) throw new InvalidArgumentException('プッシュ通知の指定が正しくありません。');
    // Pushの希望は保存しますが、アプリ内通知の生成条件にはしません。
    // FCM送信とは分けることで、PushのON/OFFによらず通知一覧へ履歴を残します。
    $start = noticeDate($input['startAt'] ?? null);
    $end = noticeDate($input['endAt'] ?? null);
    $now = (new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo')))->format('Y-m-d H:i:s');
    if ($end !== null && ($end <= ($start ?? $now) || $end <= $now)) throw new InvalidArgumentException('公開終了は公開開始と現在時刻より後にしてください。');
    return ['title' => $input['title'], 'body' => $input['body'], 'target' => $input['target'], 'targetId' => $targetId, 'startAt' => $start, 'endAt' => $end, 'push' => $input['push']];
}

function noticeRecipients(PDO $pdo, array $notice): array
{
    // 宛先はDBから確定します。グループへの招待待ち・停止・削除ユーザーは含めません。
    $sql = "SELECT u.user_id FROM users u WHERE u.status = 'active' AND u.deleted_at IS NULL";
    $params = [];
    if ($notice['target'] === '特定ユーザー') {
        $sql .= ' AND u.user_id = ?';
        $params[] = $notice['targetId'];
    } elseif ($notice['target'] === '特定グループ') {
        $sql .= " AND EXISTS (SELECT 1 FROM group_members gm INNER JOIN user_groups g ON g.group_id = gm.group_id WHERE gm.user_id = u.user_id AND gm.group_id = ? AND gm.invitation_status = 'accepted' AND g.status = 'active')";
        $params[] = $notice['targetId'];
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    if (!$ids) throw new InvalidArgumentException('対象となる有効なユーザーがいません。');
    return $ids;
}

function noticeCreate(PDO $pdo, array $input, int $adminId): int
{
    // RDSの既存記録時刻に合わせ、通知の作成・既読日時はUTCで保存します。
    // 管理画面で入力するstart_at/end_atだけは既存仕様の日本時間を維持します。
    $pdo->exec("SET time_zone = '+00:00'");
    $notice = noticeValidate($input);
    $requestKey = $input['requestKey'] ?? '';
    if (!is_string($requestKey) || !preg_match('/^[a-zA-Z0-9-]{16,64}$/D', $requestKey)) throw new InvalidArgumentException('登録キーが正しくありません。画面を開き直してください。');
    $pdo->beginTransaction();
    try {
        // 同じキーの再送は既存の登録結果を返します。同時リクエストもUNIQUE制約で直列化します。
        $stmt = $pdo->prepare("INSERT INTO admin_notices (title, body, target_type, target_id, status, start_at, end_at, push_enabled, created_by, created_at, updated_at, request_key) VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?, NOW(), NOW(), ?) ON DUPLICATE KEY UPDATE notice_id = LAST_INSERT_ID(notice_id)");
        $stmt->execute([$notice['title'], $notice['body'], $notice['target'], $notice['targetId'], $notice['startAt'], $notice['endAt'], (int) $notice['push'], $adminId, $requestKey]);
        $noticeId = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare('SELECT * FROM admin_notices WHERE notice_id = ? FOR UPDATE');
        $stmt->execute([$noticeId]);
        $saved = $stmt->fetch(PDO::FETCH_ASSOC);
        // 別内容を同じキーで再送しても、違う通知を作成したことにはしません。
        foreach (['title' => 'title', 'body' => 'body', 'target' => 'target_type', 'targetId' => 'target_id', 'startAt' => 'start_at', 'endAt' => 'end_at'] as $key => $column) {
            if ((string) $notice[$key] !== (string) $saved[$column]) throw new InvalidArgumentException('登録済みの内容と異なります。画面を開き直してください。');
        }
        if ((int) $notice['push'] !== (int) $saved['push_enabled']) throw new InvalidArgumentException('登録済みの内容と異なります。画面を開き直してください。');
        if ((int) $saved['created_by'] !== $adminId || $saved['deleted_at'] !== null) throw new InvalidArgumentException('この登録キーは使用できません。');
        if (!$saved['notification_id']) {
            $recipients = noticeRecipients($pdo, $notice);
            // 既存Repositoryを再利用し、お知らせ・通知・全宛先を一度にcommitします。
            $created = (new NotificationRepository($pdo))->createNotificationWithRecipients([
                'notificationType' => 'system', 'notificationSubtype' => 'admin_notice',
                'title' => $notice['title'], 'body' => $notice['body'], 'targetType' => 'system_notice',
                'targetId' => $noticeId, 'actionPath' => null, 'detailDataJson' => null,
                'createdBy' => $adminId, 'expiresAt' => noticeExpiryUtc($notice['endAt']),
            ], $recipients);
            $pdo->prepare('UPDATE admin_notices SET notification_id = ? WHERE notice_id = ?')->execute([$created['notificationId'], $noticeId]);
        }
        $pdo->commit();
        return $noticeId;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

// 管理画面の日本時間を、通知本体で比較するUTCへ変換して9時間の期限ずれを防ぎます。
function noticeExpiryUtc(?string $endAt): ?string
{
    return $endAt === null ? null : (new DateTimeImmutable($endAt, new DateTimeZone('Asia/Tokyo')))
        ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
}

function noticePublishRealtime(PDO $pdo, int $noticeId, ?callable $canContinue = null): bool
{
    // 定期実行からは停止時刻のガードを受け取り、長い配信も停止前に打ち切ります。
    if ($canContinue !== null && !$canContinue()) return false;
    // 通知本文は送らず、既存イベントで本人用APIの再取得だけを促します。
    // HTTP送信失敗時は完了印を残さず、CLIで再試行できます。再送は受信側で再取得するので重複しません。
    // DATETIMEは自動で時差変換されないため、公開期間だけ日本時間の現在値と比べます。
    $stmt = $pdo->prepare("SELECT notification_id FROM admin_notices WHERE notice_id = ? AND deleted_at IS NULL AND status = 'published' AND notification_id IS NOT NULL AND realtime_published_at IS NULL AND (start_at IS NULL OR start_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 HOUR)) AND (end_at IS NULL OR end_at > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 HOUR))");
    $stmt->execute([$noticeId]);
    $notificationId = $stmt->fetchColumn();
    if (!$notificationId) return false;
    $stmt = $pdo->prepare('SELECT user_id FROM notification_recipients WHERE notification_id = ?');
    $stmt->execute([$notificationId]);
    $ok = true;
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $userId) {
        if ($canContinue !== null && !$canContinue()) return false;
        try {
            $result = sendRealtimeEvent('user:' . (int) $userId, 'notification_created', ['notificationId' => (int) $notificationId], false);
            $ok = $ok && !empty($result['ok']);
        } catch (Throwable) {
            $ok = false;
        }
    }
    if ($canContinue !== null && !$canContinue()) return false;
    if ($ok) $pdo->prepare('UPDATE admin_notices SET realtime_published_at = UTC_TIMESTAMP() WHERE notice_id = ?')->execute([$noticeId]);
    return $ok;
}
