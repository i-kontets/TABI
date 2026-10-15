<?php
/**
 * 既存の宿泊一覧・施設チャットSQLがローカルMySQLの実スキーマで実行できるか確認します。
 * ローカル接続を確認→読み取り専用トランザクション→存在しないIDでSELECT→ROLLBACKの順です。
 * 個人データは表示せず、DBの構造やデータを変更しません。実施設の紐付けの正しさは別途確認が必要です。
 */
if (getenv('DB_HOST') !== 'db' || getenv('DB_NAME') !== 'tabi') exit('ローカルDBではありません');
$pdo = new PDO('mysql:host=db;dbname=tabi;charset=utf8mb4', getenv('DB_USER'), getenv('DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('START TRANSACTION READ ONLY');
try {
    $root = dirname(__DIR__);
    // SQLをコピーして別物を試さず、実APIのSELECTを読み取って使います。
    foreach (['api/Trips/GetCandidates.php', 'api/CottageChat/List.php'] as $file) {
        preg_match('/\$stmt = \$pdo->prepare\(\s*"(SELECT[\s\S]*?|\s+SELECT[\s\S]*?)"\s*\);/', file_get_contents($root . '/' . $file), $match);
        if (!$match) throw new RuntimeException('SQLが見つかりません: ' . $file);
        $sql = str_replace('{$statusCondition}', '1 = 1', $match[1]);
        $sql = str_replace('{$facilityCondition}', "AND tc.candidate_id = :candidate_id AND t.group_id = :group_id AND tc.trip_id = c.trip_id AND tc.candidate_type = 'hotel'", $sql);
        preg_match_all('/:(\w+)/', $sql, $parameters);
        $values = array_fill_keys($parameters[1], -1);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        if ($stmt->fetch()) throw new RuntimeException('予期しないデータ');
        echo 'PASS: ローカルMySQL SELECT ' . $file . PHP_EOL;
    }
} finally {
    $pdo->rollBack();
}
