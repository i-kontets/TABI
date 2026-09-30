<?php
declare(strict_types=1);

// 本番ALTER前のリハーサルから起動します。ローカル専用DBに旧RDS構造を再現します。
// 元データを壊さず追加できることと、旧API形式のINSERTが引き続き使えることを確認します。
if (PHP_SAPI !== 'cli' || getenv('DB_HOST') !== 'db' || getenv('DB_NAME') !== 'tabi') exit(1);
$database = 'tabi_migration_test_' . bin2hex(random_bytes(6));
$source = null;
$created = false;
$exitCode = 0;
try {
    $user = getenv('TABI_TEST_DB_USER') ?: getenv('DB_USER');
    $password = getenv('TABI_TEST_DB_PASSWORD') ?: getenv('DB_PASSWORD');
    $source = new PDO('mysql:host=db;dbname=tabi;charset=utf8mb4', $user, $password, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $source->exec("CREATE DATABASE `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $created = true;
    $pdo = new PDO('mysql:host=db;dbname=' . $database . ';charset=utf8mb4', $user, $password, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $pdo->exec($source->query('SHOW CREATE TABLE users')->fetch(PDO::FETCH_NUM)[1]);
    $root = dirname(__DIR__, 3);
    $pdo->exec(file_get_contents($root . '/database/schema/notification_tables_rds_20260928.sql'));
    for ($i = 0; $i < 4; $i++) $pdo->prepare("INSERT INTO admin_notices(title,body,status,created_at) VALUES ('移行前検証','ローカル専用',?,UTC_TIMESTAMP())")->execute([$i === 0 ? 'ended' : 'published']);
    $columns = $pdo->query('SHOW COLUMNS FROM admin_notices')->fetchAll(PDO::FETCH_COLUMN);
    $select = 'SELECT `' . implode('`,`', $columns) . '` FROM admin_notices ORDER BY notice_id';
    $before = $pdo->query($select)->fetchAll(PDO::FETCH_ASSOC);
    $pdo->exec(file_get_contents($root . '/database/migrations/20260928_link_admin_notice_notifications.sql'));
    if ($before !== $pdo->query($select)->fetchAll(PDO::FETCH_ASSOC)) throw new RuntimeException('既存行が変化しました。');
    echo "PASS: 既存4行・旧13列の値を維持\n";
    if ((int) $pdo->query('SELECT COUNT(*) FROM admin_notices WHERE target_id IS NULL AND notification_id IS NULL AND request_key IS NULL AND realtime_published_at IS NULL')->fetchColumn() !== 4) throw new RuntimeException('新列の初期値が不正です。');
    echo "PASS: 追加4列は既存全行でNULL\n";
    $indexes = $pdo->query("SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admin_notices'")->fetchAll(PDO::FETCH_COLUMN);
    if (array_diff(['uq_admin_notice_notification','uq_admin_notice_request','idx_admin_notice_publish'], $indexes)) throw new RuntimeException('追加索引が不足しています。');
    if ((int) $pdo->query("SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='fk_admin_notice_notification' AND DELETE_RULE='SET NULL'")->fetchColumn() !== 1) throw new RuntimeException('参照制約が不正です。');
    echo "PASS: UNIQUE2件・公開索引・外部キーを追加\n";
    $pdo->exec("INSERT INTO admin_notices(title,body,target_type,status,push_enabled,created_at) VALUES ('旧API検証','ローカル専用','全ユーザー','published',0,UTC_TIMESTAMP())");
    if ((int) $pdo->query('SELECT COUNT(*) FROM admin_notices')->fetchColumn() !== 5) throw new RuntimeException('旧形式の保存に失敗しました。');
    echo "PASS: 旧API形式のINSERTとNULLキー複数行に互換性あり\n";
    echo "合計4 PASS。本番RDS変更なし。\n";
} catch (Throwable $error) {
    echo 'FAIL: ', $error instanceof PDOException ? 'ローカルDBエラー SQLSTATE=' . $error->getCode() : $error->getMessage(), "\n";
    $exitCode = 1;
} finally {
    if ($created) $source->exec("DROP DATABASE `$database`");
}
exit($exitCode);
