<?php
header("Content-Type: application/json; charset=UTF-8");

// DB の接続情報は、ファイル(env.php)または環境変数から読み込む。
// 開発・本番で値の供給方法を切り替えやすくするための構成。
$configPath = __DIR__ . '/env.php';
$config = file_exists($configPath) ? require $configPath : [];

// ファイルの設定を優先し、なければ環境変数、さらに最後はデフォルト値を使う。
$host = $config['DB_HOST'] ?? getenv('DB_HOST') ?: 'db';
$dbname = $config['DB_NAME'] ?? getenv('DB_NAME') ?: 'tabi';
$user = $config['DB_USER'] ?? getenv('DB_USER') ?: 'tabi_user';
$password = $config['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: 'tabi_password';

try {

    // PDO で MySQL に接続する。
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $password
    );

    // SQL エラーは例外として扱うことで、呼び出し側でまとめて処理できるようにする。
    $pdo->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

} catch (PDOException $e) {

    // 接続失敗時は JSON で共通エラーを返して終了する。
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "DB接続失敗"
    ]);

    exit;
}
?>
