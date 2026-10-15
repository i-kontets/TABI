<?php
/**
 * 管理者判定のSQLと管理API共通ガードを、本番DBへ接続せず検証します。
 * SQLiteのメモリ接続または指定されたローカルMySQLでCTE（SELECTだけの仮データ）→判定→比較を行います。
 * CREATE/INSERT/UPDATEは使わず、テーブル・アカウント・権限を作成しません。
 * HTTPログイン、実アカウント、メール本人確認を検証したことにはなりません。
 */
declare(strict_types=1);
require_once dirname(__DIR__) . '/AdminAccess.php';
require_once dirname(__DIR__, 2) . '/Admin/services/notices.php';
require_once dirname(__DIR__) . '/WebSocketAuth.php';

// HTTP応答でexitする代わりに例外を返し、同じプロセスで拒否理由を確認します。
function respond(array $payload, int $status = 200): never
{
    throw new RuntimeException('response', $status);
}

// SQLの条件をそのまま実行し、必要な2表だけをSELECTの仮データとして与えます。
class ReadOnlyFixturePDO extends PDO
{
    public function __construct()
    {
        // 任意の本番接続へ切り替えられないよう、既知のローカルDocker DBだけを許可します。
        if (getenv('TABI_AUTH_TEST_MYSQL') === '1') {
            if (getenv('DB_HOST') !== 'db' || getenv('DB_NAME') !== 'tabi') throw new RuntimeException('ローカルDBではありません');
            parent::__construct('mysql:host=db;dbname=tabi;charset=utf8mb4', getenv('DB_USER'), getenv('DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $this->exec('START TRANSACTION READ ONLY');
        } else {
            parent::__construct('sqlite::memory:');
        }
    }
    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        if (!str_starts_with(trim($query), 'SELECT')) throw new RuntimeException('読み取り以外は禁止');
        $fixtures = "WITH users(user_id,email,status,deleted_at) AS (
            SELECT '1','241admin@gmail.com','active',NULL UNION ALL
            SELECT '2','viewer@example.invalid','active',NULL UNION ALL
            SELECT '3','241admin@gmail.com','active',NULL UNION ALL
            SELECT '4','241admin@gmail.com','suspended',NULL UNION ALL
            SELECT '5','241admin@gmail.com','active','2026-09-01' UNION ALL
            SELECT '6','241admin@gmail.com','active',NULL UNION ALL
            SELECT '7','241admin@gmail.com','active',NULL),
            admin_users(user_id,admin_level) AS (
            SELECT '1',9 UNION ALL SELECT '2',9 UNION ALL SELECT '4',9 UNION ALL
            SELECT '5',9 UNION ALL SELECT '6',1 UNION ALL SELECT '7',5) ";
        return parent::prepare($fixtures . $query, $options);
    }
}

// エラー時に値やセッションを出力せず、ケース名だけを報告します。
function check(bool $condition, string $label): void
{
    if (!$condition) throw new RuntimeException($label);
    echo 'PASS: ' . $label . PHP_EOL;
}

session_start();
$pdo = new ReadOnlyFixturePDO();
check(tabiAdminLevel($pdo, 1) === 9, '許可メールと既存権限を持つ有効ユーザー');
check(tabiAdminLevel($pdo, 2) === 0, '別メールは高い既存権限があっても拒否');
check(tabiAdminLevel($pdo, 3) === 0, '固定メールだけ・権限レコードなしを拒否');
check(tabiAdminLevel($pdo, 4) === 0, '停止済みユーザーを拒否');
check(tabiAdminLevel($pdo, 5) === 0, '論理削除済みユーザーを拒否');
check(tabiAdminLevel($pdo, 99) === 0, '存在しないユーザーを拒否');
check(isTabiAdminEmail(' 241ADMIN@gmail.com '), '公開登録・変更の予約メールは大小文字と空白も照合');
check(!isTabiAdminEmail('owner@example.invalid'), 'コテージ管理者のメールを固定しない');

foreach ([[0,false,401], [2,false,403], [3,false,403], [6,true,403]] as [$id,$write,$expected]) {
    $_SESSION = $id ? ['user_id' => $id] : [];
    try { noticeRequireAdmin($pdo, $write); check(false, '拒否されるべき要求'); }
    catch (RuntimeException $error) { check($error->getCode() === $expected, "共通ガード user区分{$id} " . ($write ? '更新' : '閲覧') . " HTTP {$expected}"); }
}
$_SESSION = ['user_id' => 6];
check(noticeRequireAdmin($pdo, false) === 6, 'level1の閲覧権限を維持');
$_SESSION = ['user_id' => 7];
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/json';
check(noticeRequireAdmin($pdo, true) === 7, 'level5の更新権限を維持');
$_SERVER['HTTP_SEC_FETCH_SITE'] = 'cross-site';
try { noticeRequireAdmin($pdo, true); check(false, '別サイトからの更新'); }
catch (RuntimeException $error) { check($error->getCode() === 403, '既存の送信元チェックを維持'); }
check(in_array('admin:global', wsAllowedRooms($pdo, 1, []), true), '管理購読も共通条件で許可');
check(!in_array('admin:global', wsAllowedRooms($pdo, 2, []), true), '別メールの管理購読も拒否');
session_destroy();
