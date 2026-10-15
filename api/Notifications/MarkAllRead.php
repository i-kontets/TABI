<?php

/**
 * ログイン中ユーザーの未読通知をすべて既読にするAPIです。
 *
 * 主な流れ:
 * 1. セッションからログインユーザーを特定し、不正な呼び出し(別サイトからの操作)を拒否する
 * 2. トランザクション内で未読通知をまとめて既読(is_read = 1)に更新する
 * 3. 更新件数と最新の未読件数をJSONで返す
 *
 * 扱うデータ: notification_recipients(誰にどの通知が届いたか)と notifications(通知本体)。
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

// セッションのロックを早めに解放し、同じユーザーの他のリクエストを待たせないようにします。
session_write_close();

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // 「既読化」と「未読件数の再取得」を1つのまとまりとして扱うため、トランザクションを開始します。
    $pdo->beginTransaction();

    // 現在表示対象になる未読通知だけを既読にし、期限切れ通知は更新しません。
    // read_at は COALESCE により「既に日時が入っていればそのまま、なければ現在時刻」を設定します。
    // 予約中のお知らせを一括既読に含めないため、一覧と共通の公開条件を使います。
    $visible = notificationVisibleSql();
    $stmt = $pdo->prepare("UPDATE notification_recipients AS nr INNER JOIN notifications AS n ON n.notification_id = nr.notification_id SET nr.is_read = 1, nr.read_at = COALESCE(nr.read_at, NOW()) WHERE nr.user_id = :user_id AND nr.is_read = 0 AND {$visible}");
    // SQLインジェクション対策として、ユーザーIDはプレースホルダ経由で渡します。
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->execute();

    // 実際に既読へ変わった行数を取得します(0件なら元々未読がなかったということ)。
    $updatedCount = $stmt->rowCount();

    // 更新後の最新の未読件数を取得します(通常は0になるはず)。
    $unreadCount = notificationUnreadCount($pdo, $userId);

    // ここまで問題なければ変更を確定します。
    $pdo->commit();

    // 更新件数に応じてメッセージを変え、結果をJSONで返します。
    notificationRespond(["success" => true, "message" => $updatedCount > 0 ? "すべての通知を既読にしました。" : "未読の通知はありません。", "data" => ["updatedCount" => $updatedCount, "unreadCount" => $unreadCount]]);
} catch (Throwable $error) {
    // 途中で失敗した場合は、変更を取り消して(ロールバック)中途半端な状態を防ぎます。
    if ($pdo->inTransaction()) $pdo->rollBack();
    // 失敗時は詳細を出さず、安全なメッセージだけを500エラーで返します。
    notificationRespond(["success" => false, "message" => "通知の一括既読処理に失敗しました。"], 500);
}
