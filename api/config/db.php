<?php
header("Content-Type: application/json; charset=UTF-8");

// このファイルは、各 API から共通で使う DB 接続口です。
// 先に JSON を返す前提のヘッダーを付けておき、
// 以降で接続失敗が起きてもレスポンス形式を揃えられるようにしています。

// DB の接続情報を env.php から読み込む
// env.php が存在しない環境でも壊れないよう、見つからなければ空配列で続行します。
$configPath = __DIR__ . "/env.php";
$config = file_exists($configPath) ? require $configPath : [];

// APP_ENV で接続先を切り替えます。
// local   : Docker / ローカル開発
// lolipop : ロリポップ向け設定
// aws     : AWS RDS 向け設定
// どの環境に向けて接続するかを、コードを書き換えずに切り替えるための仕組みです。
$appEnv = $config["APP_ENV"] ?? getenv("APP_ENV") ?: "local";

// env.php に connections が定義されていれば、環境ごとの設定を優先して使います。
// ここでの想定は、env.php に複数環境の接続情報をまとめておく形です。
if (isset($config["connections"][$appEnv])) {
    $dbConfig = $config["connections"][$appEnv];

    // 各値は設定ファイルから取り、未定義なら安全側のデフォルトを使います。
    $host = $dbConfig["DB_HOST"] ?? "db";
    $dbname = $dbConfig["DB_NAME"] ?? "tabi";
    $user = $dbConfig["DB_USER"] ?? "tabi_user";
    $password = $dbConfig["DB_PASSWORD"] ?? "tabi_password";
    $charset = $dbConfig["DB_CHARSET"] ?? "utf8mb4";

} else {
    // 旧形式の env.php や、個別の環境変数だけで運用している構成にも対応します。
    // つまり、connections 配列がない過去の設定でも動くようにしています。
    $host = $config["DB_HOST"] ?? getenv("DB_HOST") ?: "db";
    $dbname = $config["DB_NAME"] ?? getenv("DB_NAME") ?: "tabi";
    $user = $config["DB_USER"] ?? getenv("DB_USER") ?: "tabi_user";
    $password = $config["DB_PASSWORD"] ?? getenv("DB_PASSWORD") ?: "tabi_password";
    $charset = $config["DB_CHARSET"] ?? getenv("DB_CHARSET") ?: "utf8mb4";
}

try {

    // PDO で MySQL に接続します。
    // ここで作られる $pdo が、この後の各 API の共通接続元になります。
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset={$charset}",
        $user,
        $password
    );

    // SQL エラーは例外として扱います。
    // こうしておくと、失敗を通常の戻り値ではなく try/catch でまとめて処理できます。
    $pdo->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

    // SELECT の取得結果を連想配列にします。
    // 数値添字ではなくカラム名で扱えるため、API 側の実装が読みやすくなります。
    $pdo->setAttribute(
        PDO::ATTR_DEFAULT_FETCH_MODE,
        PDO::FETCH_ASSOC
    );

} catch (PDOException $e) {

    // 接続に失敗した場合は HTTP 500 を返します。
    // ここで JSON を返すことで、呼び出し側が失敗理由を判定しやすくなります。
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "DB接続失敗",
        "env" => $appEnv,

        // 開発時の調査用メッセージです。
        // 本番公開時は、内部情報を出しすぎないように削除または非表示にします。
        "error" => $e->getMessage()
    ]);

    exit;
}
?>