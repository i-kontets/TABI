<?php

/**
 * データベースへ接続するための設定と PDO 接続を作るファイルです。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * TABI 全体で使用するデータベース接続ファイルです。
 *
 * このファイルを読み込むと、AWS RDS の接続情報を env.php から取得し、
 * PDO という PHP 標準の仕組みで MySQL に接続します。
 * 接続に成功した場合は、以降の API で $pdo を使って SQL を実行できます。
 *
 * DBへ接続できない場合は、スケジュールだけで判断せず、
 * 実際の接続失敗をもとにフロントエンドへ DB 停止状態を返します。
 */
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/serviceSchedule.php";

// status.php やエラー記録APIなど、DB停止中でも呼び出したいAPIはここで除外します。
$serviceGuardExempt = tabiIsServiceGuardExempt();

// env.php にはDBホスト名、DB名、ユーザー名、パスワードなどの接続情報が入っています。
$configPath = __DIR__ . "/env.php";
$config = file_exists($configPath) ? require $configPath : [];

// 接続先は環境設定に従い、ローカル開発と本番で同じコードを使えるようにします。
$appEnv = $config["APP_ENV"] ?? "local";
$connection = $config["connections"][$appEnv] ?? [];

$host = $connection["DB_HOST"] ?? "";
$dbname = $connection["DB_NAME"] ?? "";
$user = $connection["DB_USER"] ?? "";
$password = $connection["DB_PASSWORD"] ?? "";
$charset = $connection["DB_CHARSET"] ?? "utf8mb4";

// 接続に最低限必要な情報がない場合は、SQLを実行する前にエラーとして終了します。
if ($host === "" || $dbname === "" || $user === "") {
    http_response_code(500);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "AWS RDS config is missing",
        "env" => $appEnv,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // PDOでMySQLへ接続します。ATTR_TIMEOUT は、DB停止中に長く待ちすぎないための秒数です。
    // PDOでAWS RDS上のMySQLへ接続します。タイムアウトを短めにし、DB停止時に画面が長く待たされないようにしています。
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset={$charset}",
        $user,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 3,
        ]
    );
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $e) {
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$serviceGuardExempt) {
        // 接続失敗時だけ、現在時刻が稼働予定内かどうかを見て「予定停止」か「予定外障害」かを分けます。
        $serviceStatus = tabiEvaluateServiceSchedule();
        $scheduledToRun = (bool) $serviceStatus["available"];
        $statusCode = $scheduledToRun ? "DATABASE_UNAVAILABLE" : "SCHEDULED_DB_STOP";
        $checkedAt = (new DateTimeImmutable("now", new DateTimeZone("Asia/Tokyo")))->format(DateTimeInterface::ATOM);

        http_response_code(503);
        // フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
        header("Cache-Control: no-store, no-cache, must-revalidate");
        // フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
        header("Pragma: no-cache");

        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        echo json_encode([
            "success" => false,
            // code/status はフロントエンドが専用画面へ切り替えるために使う状態名です。
            "code" => $statusCode,
            "status" => $statusCode,
            "databaseAvailable" => false,
            "scheduledToRun" => $scheduledToRun,
            "message" => $scheduledToRun ? "現在DBへ接続できません。" : "現在はDBの接続を停止しています。",
            "checkedAt" => $checkedAt,
            "now" => $checkedAt,
            "nextScheduledOpenAt" => $scheduledToRun ? null : $serviceStatus["nextOpenAt"],
            "nextScheduledCloseAt" => $scheduledToRun ? $serviceStatus["nextCloseAt"] : null,
            "nextOpenAt" => $scheduledToRun ? null : $serviceStatus["nextOpenAt"],
            "nextCloseAt" => $scheduledToRun ? $serviceStatus["nextCloseAt"] : null,
            "timezone" => $serviceStatus["timezone"],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        exit;
    }

    http_response_code(500);

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "DB connection failed",
        "env" => $appEnv,
        "error" => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);

    exit;
}
?>
