<?php

/**
 * 指定された1件の通知を既読にするAPIです。
 *
 * 主な流れ:
 * 1. セッションからログインユーザーを特定し、URLから対象の recipientId を受け取る
 * 2. その通知が本当に本人宛かをDBで確認し、未読なら既読(is_read = 1)へ更新する
 * 3. 更新後の状態(既読日時など)をJSONで返す
 *
 * 扱うデータ: notification_recipients テーブルの1行(recipient_id で特定)。
 */

// セッションを開始し、ログイン情報(ユーザーID)を読み取れるようにします。
session_start();

// レスポンスがJSON形式であることをフロントエンドへ伝えます。
header("Content-Type: application/json; charset=UTF-8");

// DB接続($pdo)と通知API共通の関数群を読み込みます。
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/Common.php";

// PATCH以外のメソッドで呼ばれた場合はここでエラー終了します。
notificationRequireMethod("PATCH");

// 別のサイトから勝手に既読化されるの(CSRF攻撃)を防ぐため、リクエスト元のオリジンを確認します。
notificationRejectIfCrossOrigin();

// ログインしていない場合は401エラーで終了し、ログイン済みならユーザーIDを取得します。
$userId = notificationRequireLoginUserId();

// URLから対象通知のID(recipientId または recipient_id)を受け取り、正の整数かを検証します。
// 数値でない・0以下などの場合はここでエラー終了します。
$recipientId = notificationReadPositiveInt($_GET["recipientId"] ?? $_GET["recipient_id"] ?? null, "recipientId");

// セッションのロックを早めに解放し、同じユーザーの他のリクエストを待たせないようにします。
session_write_close();

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // 対象の通知を「本人宛のもの」という条件付きで取得します。他人の通知は見つからない扱いになります。
    $current = notificationFetchRecipient($pdo, $recipientId, $userId);
    if (!$current) notificationRespond(["success" => false, "message" => "通知が見つかりません。"], 404);

    // 既読済みの場合でも失敗にしないことで、同じリクエストを複数回送っても安全にします。
    if ((int) $current["is_read"] === 0) {
        // 未読の場合のみ既読フラグを立て、read_at には初回既読時刻を記録します。
        // 検索後に公開期限を迎えても更新しないよう、UPDATE自体にも公開条件を付けます。
        $visible = notificationVisibleSql();
        $stmt = $pdo->prepare("UPDATE notification_recipients nr INNER JOIN notifications n ON n.notification_id = nr.notification_id SET nr.is_read = 1, nr.read_at = COALESCE(nr.read_at, NOW()) WHERE nr.recipient_id = :recipient_id AND nr.user_id = :user_id AND nr.is_read = 0 AND {$visible}");
        // SQLインジェクション対策として、値はプレースホルダ経由で渡します。
        $stmt->bindValue(":recipient_id", $recipientId, PDO::PARAM_INT);
        $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
        $stmt->execute();
    }

    // 更新後の最新状態を取り直し、既読日時をレスポンスに含めます。
    $updated = notificationFetchRecipient($pdo, $recipientId, $userId);
    // 更新中に公開終了・削除が起きた場合、既読にできたという誤った応答を返しません。
    if (!$updated) notificationRespond(["success" => false, "message" => "通知が見つかりません。"], 404);
    notificationRespond(["success" => true, "message" => "通知を既読にしました。", "data" => ["recipientId" => $recipientId, "isRead" => true, "readAt" => $updated["read_at"] ?? $current["read_at"]]]);
} catch (Throwable $error) {
    // 失敗時は詳細を出さず、安全なメッセージだけを500エラーで返します。
    notificationRespond(["success" => false, "message" => "通知の既読処理に失敗しました。"], 500);
}
