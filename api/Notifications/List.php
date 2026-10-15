<?php

/**
 * ログイン中ユーザー宛の通知一覧を返すAPIです。
 *
 * 主な流れ:
 * 1. セッションからログインユーザーを特定し、カテゴリ・件数(limit)・開始位置(offset)を受け取る
 * 2. 本人宛かつ期限切れでない通知を、新しい順にDBから取得する
 * 3. 通知の配列とページング情報(次ページの有無など)をJSONで返す
 *
 * 扱うデータ: notification_recipients(宛先情報)と notifications(通知本体)の結合結果。
 */

// セッションを開始し、ログイン情報(ユーザーID)を読み取れるようにします。
session_start();

// レスポンスがJSON形式であることをフロントエンドへ伝えます。
header("Content-Type: application/json; charset=UTF-8");

// DB接続($pdo)と通知API共通の関数群を読み込みます。
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

// GET以外のメソッドで呼ばれた場合はここでエラー終了します。
notificationRequireMethod("GET");

// ログインしていない場合は401エラーで終了し、ログイン済みならユーザーIDを取得します。
$userId = notificationRequireLoginUserId();

// セッションのロックを早めに解放し、同じユーザーの他のリクエストを待たせないようにします。
session_write_close();

// URLパラメータから絞り込み条件を読み取ります(不正な値は既定値に補正されます)。
$category = notificationReadCategory(); // カテゴリ絞り込み(all / chat / group など)
$limit = notificationReadLimit();       // 1回で返す最大件数
$offset = notificationReadOffset();     // 何件目から返すか(ページング用)

// カテゴリに応じたWHERE句の追加SQLと、そのプレースホルダ値を組み立てます。
[$categorySql, $categoryParams] = notificationCategorySql($category);

// 「次のページがあるか」を判定するため、実際にはlimitより1件多く取得します。
$fetchLimit = $limit + 1;

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // 同じAPIで詳細1件も復元します。必ずログイン本人の受信者ID条件と併用します。
    $recipientSql = '';
    if (isset($_GET['recipientId'])) {
        $recipientSql = ' AND nr.recipient_id = :recipient_id';
        $categoryParams[':recipient_id'] = notificationReadPositiveInt($_GET['recipientId'], 'recipientId');
    }
    $visible = notificationVisibleSql();
    // 通知一覧はログインユーザー宛だけを、受信日時の新しい順で取得します。
    // expires_at が過去の通知(期限切れ)は表示対象から除外します。
    $sql = "SELECT nr.recipient_id, nr.notification_id, nr.is_read, nr.read_at, nr.created_at AS received_at, n.notification_type, n.notification_subtype, n.title, n.body, n.target_type, n.target_id, n.action_path, n.detail_data, n.created_at, n.expires_at FROM notification_recipients AS nr INNER JOIN notifications AS n ON n.notification_id = nr.notification_id WHERE nr.user_id = :user_id AND {$visible} {$categorySql} {$recipientSql} ORDER BY nr.created_at DESC, nr.recipient_id DESC LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);

    // SQLインジェクション対策として、すべての値はプレースホルダ経由で渡します。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    foreach ($categoryParams as $name => $value) $stmt->bindValue($name, $value, PDO::PARAM_STR);

    // limit + 1件を取得し、次ページがあるかだけ判定してから返却件数をlimitに戻します。
    $stmt->bindValue(":limit", $fetchLimit, PDO::PARAM_INT);
    $stmt->bindValue(":offset", $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // limitより多く取れた場合は「次のページあり」と判断し、余分な1件は返す前に取り除きます。
    $hasMore = count($rows) > $limit;
    if ($hasMore) array_pop($rows);

    // DBの行をフロントエンド向けの形式(キー名の変換やJSON展開など)に整えて返します。
    notificationRespond(["success" => true, "data" => ["notifications" => array_map("notificationRowToResponse", $rows), "pagination" => ["limit" => $limit, "offset" => $offset, "returnedCount" => count($rows), "hasMore" => $hasMore]]]);
} catch (Throwable $error) {
    // 失敗時は詳細を出さず、安全なメッセージだけを500エラーで返します。
    notificationRespond(["success" => false, "message" => "通知一覧の取得に失敗しました。"], 500);
}
