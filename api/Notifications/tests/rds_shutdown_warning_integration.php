<?php
declare(strict_types=1);

// 本番接続設定を読み込まず、Docker内の使い捨てDBだけで検証します。
// 実通知を送らないため、送信関数を注入し、既存ユーザーの行もコピーしません。
if (PHP_SAPI !== 'cli' || getenv('DB_HOST') !== 'db' || getenv('DB_NAME') !== 'tabi') {
    fwrite(STDERR, "ローカルDocker環境専用です。\n"); exit(1);
}
require_once __DIR__ . '/../cli/publish_admin_notices.php';
require_once __DIR__ . '/../Common.php';

function warningTestDb(string $database): PDO
{
    if ($database !== 'tabi' && !preg_match('/^tabi_warning_test_[a-f0-9]{12}$/D', $database)) throw new RuntimeException('テストDB名が不正です。');
    // 使い捨てDB作成権限はローカル検証専用の環境変数で渡し、設定ファイルには保存しません。
    return new PDO('mysql:host=db;dbname=' . $database . ';charset=utf8mb4', getenv('TABI_TEST_DB_USER') ?: getenv('DB_USER'), getenv('TABI_TEST_DB_PASSWORD') ?: getenv('DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
}

// 同時起動を実際の別接続で再現します。子プロセスにも本番接続先は渡しません。
if (($argv[1] ?? '') === '--worker') {
    try {
        $pdo = warningTestDb($argv[2]);
        $result = (new RdsShutdownWarning($pdo, static fn() => new DateTimeImmutable('2026-10-05T19:30:00+09:00'), static function () {
            usleep(150000);
            return ['ok' => true];
        }))->run();
        echo json_encode($result, JSON_THROW_ON_ERROR);
        exit(0);
    } catch (Throwable) { fwrite(STDERR, "同時実行テスト失敗\n"); exit(1); }
}

$checks = 0;
function warningCheck(bool $ok, string $label): void
{
    global $checks;
    if (!$ok) throw new RuntimeException($label);
    $checks++;
    echo "PASS: $label\n";
}

$source = warningTestDb('tabi');
$database = 'tabi_warning_test_' . bin2hex(random_bytes(6));
$createdDatabase = false;
$children = [];
$exitCode = 0;
try {
    $source->exec("CREATE DATABASE `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $createdDatabase = true;
    $pdo = warningTestDb($database);
    $pdo->exec($source->query('SHOW CREATE TABLE users')->fetch(PDO::FETCH_NUM)[1]);
    // 追加4列がないRDSスナップショットをそのまま再現し、新ALTERが不要なことも確認します。
    $pdo->exec(file_get_contents(dirname(__DIR__, 3) . '/database/schema/notification_tables_rds_20260928.sql'));
    $users = [];
    foreach (['A' => ['active', null], 'B' => ['active', null], 'suspended' => ['suspended', null], 'deleted' => ['active', '2000-01-01 00:00:00']] as $name => [$status, $deleted]) {
        $pdo->prepare('INSERT INTO users (name,email,password_hash,status,deleted_at,created_at,updated_at) VALUES (?,?,?, ?,?,NOW(),NOW())')->execute([$name, $name . '@example.invalid', 'unusable-test-hash', $status, $deleted]);
        $users[$name] = (int) $pdo->lastInsertId();
    }
    $events = [];
    $emit = static function ($room, $event, $data, $log) use (&$events): array {
        $events[] = compact('room', 'event', 'data', 'log');
        return ['ok' => true];
    };
    $at = new DateTimeImmutable('2026-09-28T19:29:00+09:00');
    $clock = static function () use (&$at): DateTimeImmutable { return $at; };
    $connections = 0;
    $connect = static function () use ($pdo, &$connections): PDO { $connections++; return $pdo; };

    // 前後1分を含め、通知作成と再実行の結果をDBに照らして確認します。
    $cases = [
        ['2026-09-28T19:29:00+09:00', 'not_due', 0, 'Test 1 月曜19:29は作成しない'],
        ['2026-09-28T19:30:00+09:00', 'created', 1, 'Test 2 月曜19:30は1件作成'],
        ['2026-09-28T19:31:00+09:00', 'already_created', 1, 'Test 3 月曜19:31は追加なし'],
        ['2026-09-29T19:30:00+09:00', 'outside_run_window', 1, 'Test 4 火曜はDB接続なし'],
        ['2026-09-30T19:30:00+09:00', 'created', 2, 'Test 5 水曜19:30は1件作成'],
        ['2026-10-01T19:30:00+09:00', 'created', 3, 'Test 6 木曜19:30は1件作成'],
        ['2026-10-02T11:59:00+09:00', 'not_due', 3, 'Test 7 金曜11:59は作成しない'],
        ['2026-10-02T12:00:00+09:00', 'created', 4, 'Test 8 金曜12:00は1件作成'],
        ['2026-10-02T12:01:00+09:00', 'already_created', 4, 'Test 9 金曜12:01は追加なし'],
        ['2026-10-03T19:30:00+09:00', 'outside_run_window', 4, 'Test 10 土曜はDB接続なし'],
        ['2026-10-04T19:30:00+09:00', 'outside_run_window', 4, 'Test 10 日曜はDB接続なし'],
        ['2026-10-02T12:00:00+09:00', 'already_created', 4, 'Test 11 同時刻を再実行しても追加なし'],
    ];
    foreach ($cases as [$date, $expected, $total, $label]) {
        $at = new DateTimeImmutable($date);
        $before = $connections;
        $result = runNotificationPublisher($connect, $clock, $emit);
        $actual = $result['warning']['status'] ?? $result['status'];
        warningCheck($actual === $expected && (int) $pdo->query('SELECT COUNT(*) FROM notifications')->fetchColumn() === $total && ($expected !== 'outside_run_window' || $before === $connections), $label);
    }
    warningCheck(count($events) === 8, '作成した4日分だけ各2人へ送信し、再実行では再送しない');
    $recipients = $pdo->query('SELECT DISTINCT user_id FROM notification_recipients ORDER BY user_id')->fetchAll(PDO::FETCH_COLUMN);
    warningCheck(array_map('intval', $recipients) === [$users['A'], $users['B']], '停止・削除ユーザーを宛先から除外');
    warningCheck((int) $pdo->query('SELECT COUNT(*) FROM notification_recipients WHERE is_read=0 AND read_at IS NULL AND delivered_at IS NULL')->fetchColumn() === 8, '宛先は未読、WebSocket成功をPush配信済みと混同しない');
    $rows = $pdo->query('SELECT * FROM notifications ORDER BY notification_id')->fetchAll(PDO::FETCH_ASSOC);
    warningCheck($rows[0]['expires_at'] === '2026-09-28 11:00:00' && $rows[3]['expires_at'] === '2026-10-02 03:30:00', '月曜20時・金曜12:30をUTC期限へ換算');
    $detail = json_decode($rows[0]['detail_data'], true);
    warningCheck($detail['dedupKey'] === 'rds_shutdown_warning_2026-09-28' && $detail['realtimeState'] === 'sent' && isset($detail['realtimePublishedAt']), '日付キー・送信依頼完了時刻を既存JSONへ保存');
    warningCheck($events[0]['event'] === 'notification_created' && array_keys($events[0]['data']) === ['notificationId'], '既存イベントへIDだけを送る');
    $at = new DateTimeImmutable('2026-09-28T10:00:00+09:00');
    $result = runNotificationPublisher($connect, $clock, $emit);
    warningCheck($result['adminSchemaReady'] === false && $result['adminSelected'] === 0, '旧admin_notices構造でも停止予告が動作し、管理者予約だけを省略');

    // 休業日は全1440分を評価し、接続関数が一度も呼ばれないことを検証します。
    foreach (['2026-09-29', '2026-10-03', '2026-10-04'] as $date) {
        $before = $connections;
        for ($minute = 0; $minute < 1440; $minute++) {
            $at = (new DateTimeImmutable($date . 'T00:00:00+09:00'))->modify("+$minute minutes");
            runNotificationPublisher($connect, $clock, $emit);
        }
        warningCheck($before === $connections, "Test 12 $date は終日DB非接続");
    }
    foreach (['2026-09-28T08:29:00+09:00', '2026-09-28T19:59:00+09:00', '2026-09-28T20:00:00+09:00', '2026-09-30T20:00:00+09:00', '2026-10-01T20:00:00+09:00', '2026-10-02T12:29:00+09:00', '2026-10-02T12:30:00+09:00'] as $date) {
        $at = new DateTimeImmutable($date);
        $before = $connections;
        $result = runNotificationPublisher($connect, $clock, $emit);
        warningCheck(!$result['connected'] && $before === $connections, "Test 12 接続開始しない: $date");
    }
    $at = new DateTimeImmutable('2026-09-28T08:30:00+09:00');
    warningCheck(runNotificationPublisher($connect, $clock, $emit)['connected'], '稼働開始08:30から予約公開CLIを実行可能');
    warningCheck(tabiShutdownWarningPlan(new DateTimeImmutable('2026-09-28T10:30:00Z'))['notificationAt'] === '2026-09-28T19:30:00+09:00', 'UTC入力も日本時間として判定');

    foreach ([1, 2] as $_) {
        $process = proc_open([PHP_BINARY, __FILE__, '--worker', $database], [0=>['file','/dev/null','r'],1=>['pipe','w'],2=>['file','/dev/null','w']], $pipes);
        $children[] = [$process, $pipes[1]];
    }
    $statuses = [];
    foreach ($children as [$process, $pipe]) {
        $result = json_decode(stream_get_contents($pipe), true);
        fclose($pipe);
        if (proc_close($process) !== 0) throw new RuntimeException('子プロセス失敗');
        $statuses[] = $result['status'];
    }
    $children = [];
    warningCheck(count(array_filter($statuses, static fn($s) => $s === 'created')) === 1 && (int) $pdo->query("SELECT COUNT(*) FROM notifications WHERE JSON_UNQUOTE(JSON_EXTRACT(detail_data,'$.dedupKey'))='rds_shutdown_warning_2026-10-05'")->fetchColumn() === 1, 'Test 11 別プロセス同時起動でも作成は1件');

    // 将来日の通知で一覧共通処理も確認し、実時計の経過で期限切れになるテストを避けます。
    $at = (new DateTimeImmutable('2099-01-01T19:30:00+09:00'))->modify('next monday')->setTime(19, 30);
    $failedEmits = 0;
    $failure = static function () use (&$failedEmits): array { $failedEmits++; return ['ok' => false]; };
    $result = runNotificationPublisher($connect, $clock, $failure);
    $id = $result['warning']['notificationId'];
    warningCheck($result['failed'] === 1 && $result['warning']['status'] === 'created_realtime_incomplete', 'WebSocket失敗を記録してDB通知を維持');
    runNotificationPublisher($connect, $clock, $failure);
    warningCheck($failedEmits === 2, '失敗後も重複送信を避け、次のcronで再送しない');
    $stmt = $pdo->prepare('SELECT recipient_id FROM notification_recipients WHERE notification_id=? AND user_id=?');
    $stmt->execute([$id, $users['A']]);
    $recipientId = (int) $stmt->fetchColumn();
    $visible = notificationFetchRecipient($pdo, $recipientId, $users['A']);
    warningCheck($visible !== null && notificationUnreadCount($pdo, $users['A']) > 0, 'WS失敗後も一覧共通SQL・未読件数から取得可能');
    $stmt = $pdo->prepare('SELECT n.*, nr.recipient_id, nr.is_read, nr.read_at, nr.created_at AS received_at FROM notifications n INNER JOIN notification_recipients nr ON nr.notification_id=n.notification_id WHERE nr.recipient_id=?');
    $stmt->execute([$recipientId]);
    warningCheck(str_ends_with(notificationRowToResponse($stmt->fetch(PDO::FETCH_ASSOC))['createdAt'], '+00:00'), '停止予告の日時レスポンスにUTCを明示');
    $pdo->prepare("UPDATE notifications SET expires_at='2000-01-01 00:00:00' WHERE notification_id=?")->execute([$id]);
    warningCheck(notificationFetchRecipient($pdo, $recipientId, $users['A']) === null, '停止時刻を過ぎた通知は一覧対象外');

    // 2人目の宛先保存を故意に失敗させ、通知本体と1人目の行も残らないことを確認します。
    $pdo->exec("CREATE TRIGGER fail_test_recipient BEFORE INSERT ON notification_recipients FOR EACH ROW BEGIN IF NEW.user_id = {$users['B']} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test rollback'; END IF; END");
    $at = new DateTimeImmutable('2026-10-07T19:30:00+09:00');
    $beforeRows = (int) $pdo->query('SELECT COUNT(*) FROM notifications')->fetchColumn();
    $beforeEvents = count($events);
    $threw = false;
    try { runNotificationPublisher($connect, $clock, $emit); } catch (PDOException) { $threw = true; }
    $pdo->exec('DROP TRIGGER fail_test_recipient');
    warningCheck($threw && !$pdo->inTransaction() && $beforeRows === (int) $pdo->query('SELECT COUNT(*) FROM notifications')->fetchColumn() && $beforeEvents === count($events), '保存失敗は全体rollbackし、外部送信もしない');
    warningCheck(runNotificationPublisher($connect, $clock, $emit)['warning']['status'] === 'created', 'rollback後の再実行は安全に1件作成可能');

    // 大人数の宛先保存中に停止猶予へ入るケースを再現し、途中保存を残さないことを確認します。
    $at = new DateTimeImmutable('2026-10-09T12:28:59+09:00');
    $beforeRecipients = (int) $pdo->query('SELECT COUNT(*) FROM notification_recipients')->fetchColumn();
    $beforeRows = (int) $pdo->query('SELECT COUNT(*) FROM notifications')->fetchColumn();
    $duringSave = static function () use ($pdo, &$at, $beforeRecipients): DateTimeImmutable {
        if ($pdo->inTransaction() && (int) $pdo->query('SELECT COUNT(*) FROM notification_recipients')->fetchColumn() > $beforeRecipients) $at = $at->setTime(12, 29);
        return $at;
    };
    $threw = false;
    try { runNotificationPublisher($connect, $duringSave, $emit); } catch (RuntimeException) { $threw = true; }
    warningCheck($threw && !$pdo->inTransaction() && $beforeRows === (int) $pdo->query('SELECT COUNT(*) FROM notifications')->fetchColumn() && $beforeRecipients === (int) $pdo->query('SELECT COUNT(*) FROM notification_recipients')->fetchColumn(), '宛先保存中に終了猶予へ入ったら全体rollback');

    // 長い送信中に終了猶予へ入った場合、残り宛先を処理しないことを確認します。
    $at = new DateTimeImmutable('2026-10-08T19:58:59+09:00');
    $attempts = 0;
    $advance = static function () use (&$at, &$attempts): array { $attempts++; $at = $at->setTime(19, 59); return ['ok' => true]; };
    $result = runNotificationPublisher($connect, $clock, $advance);
    warningCheck($attempts === 1 && $result['status'] === 'deadline' && $result['warning']['status'] === 'created_realtime_incomplete', '終了猶予に達したら新しい送信を始めない');
    echo "合計 $checks PASS。本番通信なし。\n";
} catch (Throwable $error) {
    echo 'FAIL: ', $error instanceof PDOException ? 'ローカルDB検証エラー SQLSTATE=' . $error->getCode() . ' / code=' . ($error->errorInfo[1] ?? 'unknown') : $error->getMessage(), "\n";
    $exitCode = 1;
} finally {
    foreach ($children as [$process, $pipe]) {
        if (is_resource($pipe)) fclose($pipe);
        if (is_resource($process)) { proc_terminate($process); proc_close($process); }
    }
    // この実行で作った名前のDBだけを消し、既存tabi DBの構造・行は残します。
    if ($createdDatabase) $source->exec("DROP DATABASE `$database`");
}
exit($exitCode);
