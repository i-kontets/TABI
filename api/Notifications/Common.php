<?php


/**
 * 通知APIで共通利用する認証確認、入力値取得、通知データ整形をまとめた共通ファイルです。
 *
 * 使用画面・機能: 通知一覧、通知設定、通知バッジ、FCM端末登録
 * 呼び出し元: 現在のコード内では直接のfetch呼び出しを確認できません。
 * URL: /api/Notifications/Common.php
 * HTTPメソッド: コード内でHTTPメソッドの明示判定なし
 * 入力: URLクエリ($_GET)、ログイン情報($_SESSION)
 * 使用DB: notification_recipients、notifications
 * 認証情報や秘密鍵などの実値はコメントに残さず、処理の目的だけを説明します。
 */

declare(strict_types=1);

/**
 * 通知履歴API(List / UnreadCount / MarkRead / MarkAllRead)だけで使う小さな共通処理集です。
 *
 * 主な流れ:
 * 1. 各通知APIから require され、レスポンス返却・認証確認・入力値検証の関数を提供する
 * 2. user_idはリクエストから受け取らず、ログイン中のセッションだけを信頼する
 * 3. DBの行データをフロントエンド向けの形式へ変換する
 *
 * 扱うデータ: セッションのユーザーID、$_GET のパラメータ、notification系テーブルの行。
 */

/**
 * 処理結果をJSONで出力し、そこで処理を終了(exit)する共通関数です。
 * $status にはHTTPステータスコード(200=成功、400=入力エラー等)を指定します。
 */
function notificationRespond(array $payload, int $status = 200): void
{
    // HTTPステータスコードを設定します。
    http_response_code($status);
    // 日本語をそのまま(\uXXXXにエスケープせず)出力し、URLの / もエスケープしません。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    // レスポンスを返したら以降の処理は行いません。
    exit;
}

/**
 * ログイン済みかを確認し、ログイン中ユーザーのIDを返します。
 * 未ログインの場合は401エラーを返して終了します。
 */
function notificationRequireLoginUserId(): int
{
    // セッションにuser_idがなければ未ログインと判断します。
    if (!isset($_SESSION["user_id"])) {
        notificationRespond(["success" => false, "message" => "ログインが必要です。"], 401);
    }
    // セッションの値を整数に変換して返します。
    return (int) $_SESSION["user_id"];
}

/**
 * HTTPメソッドが期待どおりかを確認します。
 * 例: GET専用APIにPOSTで来た場合は405エラーで終了します。
 */
function notificationRequireMethod(string $expectedMethod): void
{
    if (($_SERVER["REQUEST_METHOD"] ?? "") !== $expectedMethod) {
        notificationRespond(["success" => false, "message" => "許可されていないメソッドです。"], 405);
    }
}

/**
 * 別ドメインのサイトからの書き込みリクエスト(CSRF攻撃)を拒否します。
 * リクエスト元(Origin/Referer)のホスト名と自サイトのホスト名を比較します。
 */
function notificationRejectIfCrossOrigin(): void
{
    // 自サイトのホスト名と、リクエスト元の情報を取得します。
    // 一覧・詳細画面からの既読APIで、開発用ポート付きHostも同じホストとして比較します。
    // Originから取り出す値にはポートがないため、HTTP_HOST側も同じ形式にそろえます。
    $host = parse_url('http://' . ($_SERVER["HTTP_HOST"] ?? ""), PHP_URL_HOST) ?: "";
    $origin = $_SERVER["HTTP_ORIGIN"] ?? "";
    $referer = $_SERVER["HTTP_REFERER"] ?? "";
    // Originヘッダーを優先し、なければRefererを使います。
    $source = $origin !== "" ? $origin : $referer;
    // どちらも取得できない場合(ブラウザ以外からの呼び出し等)は判定できないため通します。
    if ($source === "" || $host === "") return;
    // リクエスト元URLからホスト名部分だけを取り出して比較します(大文字小文字は区別しません)。
    $sourceHost = parse_url($source, PHP_URL_HOST);
    if ($sourceHost !== null && strcasecmp($sourceHost, $host) !== 0) {
        notificationRespond(["success" => false, "message" => "不正な送信元です。"], 403);
    }
}

/**
 * 値が「1以上の整数」であることを検証して返します。
 * 不正な値の場合は、項目名($name)入りのエラーメッセージで400終了します。
 */
function notificationReadPositiveInt($value, string $name): int
{
    $intValue = filter_var($value, FILTER_VALIDATE_INT);
    if ($intValue === false || $intValue < 1) notificationRespond(["success" => false, "message" => $name . "の値が正しくありません。"], 400);
    return (int) $intValue;
}

/**
 * URLの ?limit= (1回で返す件数)を読み取ります。既定値20、上限50件です。
 */
function notificationReadLimit(): int
{
    $limit = filter_var($_GET["limit"] ?? 20, FILTER_VALIDATE_INT);
    // 1未満や50超、数値でない場合はエラーにします(大量取得によるDB負荷を防ぐため)。
    if ($limit === false || $limit < 1 || $limit > 50) notificationRespond(["success" => false, "message" => "limitの値が正しくありません。"], 400);
    return (int) $limit;
}

/**
 * URLの ?offset= (何件目から取得するか)を読み取ります。既定値0です。
 */
function notificationReadOffset(): int
{
    $offset = filter_var($_GET["offset"] ?? 0, FILTER_VALIDATE_INT);
    if ($offset === false || $offset < 0) notificationRespond(["success" => false, "message" => "offsetの値が正しくありません。"], 400);
    return (int) $offset;
}

/**
 * URLの ?category= (通知の絞り込み種別)を読み取ります。既定値は "all"(全件)です。
 * 許可された値以外が来た場合は400エラーで終了します。
 */
function notificationReadCategory(): string
{
    $category = (string) ($_GET["category"] ?? "all");
    if (!in_array($category, ["all", "unread", "chat", "schedule", "survey", "system"], true)) notificationRespond(["success" => false, "message" => "categoryの値が正しくありません。"], 400);
    return $category;
}

/**
 * カテゴリに応じたWHERE句の追加SQLと、プレースホルダの値を組み立てて返します。
 * 戻り値: [追加SQL文字列, プレースホルダ配列] の2要素配列。
 */
function notificationCategorySql(string $category): array
{
    // "unread" は既読フラグでの絞り込みです。
    if ($category === "unread") return [" AND nr.is_read = 0", []];
    // 通知種別(chat/schedule/survey/system)での絞り込みです。値はプレースホルダで渡します。
    if (in_array($category, ["chat", "schedule", "survey", "system"], true)) return [" AND n.notification_type = :category", [":category" => $category]];
    // "all" の場合は絞り込みなしです。
    return ["", []];
}

/**
 * DBに文字列として保存されている詳細データ(detail_data)をJSONとして解析して返します。
 * 空・解析失敗・配列以外の場合は null を返し、フロントエンドが壊れないようにします。
 */
function notificationDecodeDetailData($value)
{
    if ($value === null || $value === "") return null;
    $decoded = json_decode((string) $value, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) return null;
    return $decoded;
}

/**
 * 通知タップ時の遷移先パス(action_path)を安全な形に検証して返します。
 * 不正な値(外部URLなど)は null にして返します。
 */
function notificationSafeActionPath($path): ?string
{
    // 文字列以外・空文字は遷移先なしとして扱います。
    if ($path === null || $path === "" || !is_string($path)) return null;
    $path = trim($path);
    if ($path === "") return null;
    // action_pathはTABI内部の遷移先だけとして扱います。外部URLやjavascript:は返しません。
    if (preg_match('#^/TABI(?:/|$)#', $path) !== 1) return null;
    return $path;
}

/**
 * DBの1行(スネークケースのカラム名)を、フロントエンド向けの形式(キャメルケース)へ変換します。
 * 型も合わせて整えます(IDは数値、is_readは真偽値、など)。
 */
function notificationRowToResponse(array $row): array
{
    // 管理者通知と停止予告はUTCで記録するため、ブラウザが日本時間と誤認しない形式で返します。
    // 既存の他種類の通知データは、この変更で時刻の解釈を変更しません。
    if (in_array($row['notification_subtype'] ?? null, ['admin_notice', 'rds_shutdown_warning'], true)) {
        foreach (['read_at', 'created_at', 'received_at', 'expires_at'] as $key) {
            if (!empty($row[$key])) $row[$key] = (new DateTimeImmutable($row[$key], new DateTimeZone('UTC')))->format(DateTimeInterface::ATOM);
        }
    }
    return [
        "recipientId" => (int) $row["recipient_id"], "notificationId" => (int) $row["notification_id"], "category" => (string) $row["notification_type"], "subtype" => $row["notification_subtype"] !== null ? (string) $row["notification_subtype"] : null,
        "title" => (string) $row["title"], "body" => (string) $row["body"], "targetType" => $row["target_type"] !== null ? (string) $row["target_type"] : null, "targetId" => $row["target_id"] !== null ? (int) $row["target_id"] : null,
        "actionPath" => notificationSafeActionPath($row["action_path"] ?? null), "detailData" => notificationDecodeDetailData($row["detail_data"] ?? null), "isRead" => (bool) $row["is_read"], "readAt" => $row["read_at"], "createdAt" => $row["created_at"], "receivedAt" => $row["received_at"], "expiresAt" => $row["expires_at"],
    ];
}

/**
 * 通知の宛先レコード1件を「本人宛であること」を条件に取得します。
 * 見つからない場合(他人の通知や存在しないIDの場合)は null を返します。
 */
function notificationFetchRecipient(PDO $pdo, int $recipientId, int $userId): ?array
{
    // recipient_id and user_id are both required to protect other users' notifications.
    // recipient_id だけでなく user_id も条件に入れることで、他ユーザーの通知を守ります。
    // 公開前・終了後・削除済み通知は、IDを知っていても既読にできません。
    $visible = notificationVisibleSql();
    $stmt = $pdo->prepare("SELECT nr.recipient_id, nr.is_read, nr.read_at FROM notification_recipients nr INNER JOIN notifications n ON n.notification_id = nr.notification_id WHERE nr.recipient_id = :recipient_id AND nr.user_id = :user_id AND {$visible} LIMIT 1");
    $stmt->bindValue(":recipient_id", $recipientId, PDO::PARAM_INT);
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    // fetch は見つからないと false を返すため、null に統一して返します。
    return $row ?: null;
}

/**
 * 指定ユーザーの未読通知件数をDBから数えて返します。
 */
function notificationUnreadCount(PDO $pdo, int $userId): int
{
    // 期限切れ通知は現在画面に出ないため、未読件数にも含めません。
    $visible = notificationVisibleSql();
    $stmt = $pdo->prepare("SELECT COUNT(*) AS unread_count FROM notification_recipients AS nr INNER JOIN notifications AS n ON n.notification_id = nr.notification_id WHERE nr.user_id = :user_id AND nr.is_read = 0 AND {$visible}");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();
    return (int) $stmt->fetchColumn();
}

// 一覧・詳細・未読数・既読操作で同じ公開条件を使います。
// 予約通知は先にDBへ保存しても、管理者お知らせの公開時刻になるまで外へ出しません。
function notificationVisibleSql(): string
{
    // 既存通知の期限比較は維持し、管理者通知と停止予告はUTCの期限として判定します。
    return "(n.expires_at IS NULL OR n.expires_at > CASE WHEN n.notification_subtype IN ('admin_notice', 'rds_shutdown_warning') THEN UTC_TIMESTAMP() ELSE NOW() END) AND (
        COALESCE(n.notification_subtype, '') <> 'admin_notice' OR EXISTS (
            SELECT 1 FROM admin_notices a WHERE a.notice_id = n.target_id
            AND a.deleted_at IS NULL AND a.status = 'published'
            AND (a.start_at IS NULL OR a.start_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 HOUR))
            AND (a.end_at IS NULL OR a.end_at > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 HOUR))
        )
    )";
}

/**
 * バッジ(アイコン上の赤い数字)用の表示文字列を作ります。
 * 0件なら null(バッジ非表示)、100件以上は "99+" と表示します。
 */
function notificationBadgeText(int $unreadCount): ?string
{
    if ($unreadCount <= 0) return null;
    return $unreadCount >= 100 ? "99+" : (string) $unreadCount;
}
