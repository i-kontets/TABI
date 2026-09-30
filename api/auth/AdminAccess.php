<?php
/**
 * TABI全体の管理者判定を共通化します。ログイン・本人確認・管理APIから呼び、
 * セッションで確認したユーザーIDを使ってDBのメール・有効状態・既存権限を読みます。
 * ブラウザの入力値から権限を作ったり、アカウントを登録したりはしません。
 */
const TABI_ADMIN_EMAIL = '241admin@gmail.com';

// 公開登録・メール変更から予約済みの管理者メールを取得されることを防ぎます。
function isTabiAdminEmail(string $email): bool
{
    return strtolower(trim($email)) === TABI_ADMIN_EMAIL;
}

// 認証済みIDに対する現在の権限を返します。メール一致だけでは必ず0になります。
// 既存の閲覧level>=1、更新level>=5を維持し、削除・停止済みユーザーを除外します。
function tabiAdminLevel(PDO $pdo, int $userId): int
{
    $stmt = $pdo->prepare("SELECT MAX(a.admin_level) FROM admin_users a
        INNER JOIN users u ON u.user_id = a.user_id
        WHERE a.user_id = ? AND LOWER(TRIM(u.email)) = ?
          AND u.status = 'active' AND u.deleted_at IS NULL");
    $stmt->execute([$userId, TABI_ADMIN_EMAIL]);
    return (int) $stmt->fetchColumn();
}
