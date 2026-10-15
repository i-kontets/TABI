<?php
declare(strict_types=1);

// 公開予約とRDS停止予告を1つのCLIで処理し、別スケジューラーを増やしません。
// DB接続より先に曜日・時刻を確認するため、接続ファイルはまだ読み込みません。
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../../config/serviceSchedule.php';
require_once __DIR__ . '/../Service/RdsShutdownWarning.php';

/** 接続と時計を注入可能にして、停止時間中に接続しないことを安全に検証します。 */
function runNotificationPublisher(?Closure $connect = null, ?Closure $clock = null, ?Closure $emit = null): array
{
    $clock ??= static fn() => new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo'));
    $plan = tabiShutdownWarningPlan($clock());
    if (!$plan['canRun']) return ['status' => 'outside_run_window', 'connected' => false];
    // dry-runと停止時間中は、送信設定・ログ機能の依存ファイルまで読み込まないよう遅延します。
    require_once __DIR__ . '/../../Admin/services/realtime.php';
    $connect ??= static function (): PDO {
        // realtime.phpの既存設定フォールバックも同じ設定を使えるようにします。
        global $config;
        require __DIR__ . '/../../config/db.php';
        return $pdo;
    };
    // 稼働時間中も接続は1回だけです。障害時にループして再接続しません。
    $pdo = $connect();
    $pdo->exec("SET time_zone = '+00:00'");
    // テーブルのロック待ちを短く制限し、停止時刻近くまで処理が滞留するのを避けます。
    $pdo->exec('SET SESSION innodb_lock_wait_timeout = 3');
    if (!(int) $pdo->query("SELECT GET_LOCK('tabi_notice_publisher', 0)")->fetchColumn()) return ['status' => 'busy', 'connected' => true];
    try {
        $emit ??= static fn($room, $event, $data, $log) => sendRealtimeEvent($room, $event, $data, $log);
        $warning = (new RdsShutdownWarning($pdo, $clock, $emit))->run();
        $canContinue = static fn() => tabiShutdownWarningPlan($clock())['canRun'];
        if (!$canContinue()) return ['status' => 'deadline', 'warning' => $warning, 'connected' => true, 'failed' => $warning['status'] === 'created_realtime_incomplete' ? 1 : 0];

        // 管理者通知用の未承認ALTERには依存させません。追加列がない環境はその予約処理だけ省略します。
        $ready = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_notices' AND COLUMN_NAME IN ('target_id','notification_id','request_key','realtime_published_at')")->fetchColumn() === 4;
        $ids = $ready ? $pdo->query("SELECT notice_id FROM admin_notices WHERE notification_id IS NOT NULL AND realtime_published_at IS NULL AND deleted_at IS NULL AND status = 'published' AND (start_at IS NULL OR start_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 HOUR)) AND (end_at IS NULL OR end_at > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 HOUR)) ORDER BY notice_id LIMIT 100")->fetchAll(PDO::FETCH_COLUMN) : [];
        $failed = $warning['status'] === 'created_realtime_incomplete' ? 1 : 0;
        foreach ($ids as $id) {
            if (!$canContinue()) break;
            if (!noticePublishRealtime($pdo, (int) $id, $canContinue)) $failed++;
        }
        return ['status' => 'completed', 'connected' => true, 'warning' => $warning, 'adminSchemaReady' => $ready, 'adminSelected' => count($ids), 'failed' => $failed];
    } finally {
        try { $pdo->query("SELECT RELEASE_LOCK('tabi_notice_publisher')"); } catch (Throwable) {}
    }
}

// テストから関数を読み込んでも実行しません。時刻指定はDB非接続のdry-runだけに限定します。
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    try {
        $dryRun = false;
        $at = null;
        foreach (array_slice($argv, 1) as $arg) {
            if ($arg === '--dry-run') $dryRun = true;
            elseif (str_starts_with($arg, '--at=')) $at = substr($arg, 5);
            else throw new InvalidArgumentException('不明なオプションです。');
        }
        if ($at !== null && (!$dryRun || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/D', $at))) throw new InvalidArgumentException('時刻指定はdry-run専用です。');
        $result = $dryRun
            ? tabiShutdownWarningPlan(new DateTimeImmutable($at ?? 'now', new DateTimeZone('Asia/Tokyo')))
            : runNotificationPublisher();
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;
        exit(!empty($result['failed']) ? 1 : 0);
    } catch (Throwable) {
        // 接続先・認証情報が含まれる可能性のある例外本文は出力しません。
        fwrite(STDERR, "通知の公開処理に失敗しました。再接続せず終了します。\n");
        exit(1);
    }
}
