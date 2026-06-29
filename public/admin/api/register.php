<?php
// 新規管理人登録API
// POST /api/register.php
// body: { name, email, password, chat_id }
session_start();
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../../api/config/db.php';

function respond(array $p, int $s = 200): void {
    http_response_code($s);
    echo json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'POSTで送信してください'], 405);
}

$input    = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = $_POST;

$name     = trim((string)($input['name']     ?? ''));
$email    = trim((string)($input['email']    ?? ''));
$password = trim((string)($input['password'] ?? ''));
$chatId   = filter_var($input['chat_id'] ?? null, FILTER_VALIDATE_INT);

// バリデーション
if ($name === '') {
    respond(['success' => false, 'message' => '名前を入力してください'], 400);
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['success' => false, 'message' => '有効なメールアドレスを入力してください'], 400);
}
if (mb_strlen($password) < 6) {
    respond(['success' => false, 'message' => 'パスワードは6文字以上で入力してください'], 400);
}
if (!$chatId || $chatId < 1) {
    respond(['success' => false, 'message' => '担当ホテルのチャットIDを入力してください'], 400);
}

try {
    // メールアドレス重複チェック
    $dup = $pdo->prepare("SELECT user_id FROM users WHERE email = :email LIMIT 1");
    $dup->bindValue(':email', $email, PDO::PARAM_STR);
    $dup->execute();
    if ($dup->fetchColumn()) {
        respond(['success' => false, 'message' => 'このメールアドレスはすでに登録されています'], 409);
    }

    // chat_idがhotelタイプか確認
    $chatChk = $pdo->prepare("
        SELECT chat_id FROM chats
        WHERE chat_id = :c AND chat_type = 'hotel'
        LIMIT 1
    ");
    $chatChk->bindValue(':c', $chatId, PDO::PARAM_INT);
    $chatChk->execute();
    if (!$chatChk->fetchColumn()) {
        respond(['success' => false, 'message' => '指定されたチャットIDが見つかりません。ホテルチャットIDを確認してください'], 404);
    }

    // トランザクション開始
    $pdo->beginTransaction();

    // usersテーブルにINSERT（パスワードは平文のままTABIと統一）
    $ins = $pdo->prepare("
        INSERT INTO users
          (name, email, password_hash, icon_url, language_code, status, created_at, updated_at, deleted_at)
        VALUES
          (:name, :email, :password, NULL, 'ja', 'active', NOW(), NOW(), NULL)
    ");
    $ins->bindValue(':name',     $name,     PDO::PARAM_STR);
    $ins->bindValue(':email',    $email,    PDO::PARAM_STR);
    $ins->bindValue(':password', $password, PDO::PARAM_STR);
    $ins->execute();
    $userId = (int)$pdo->lastInsertId();

    // user_profilesにINSERT
    $prof = $pdo->prepare("
        INSERT INTO user_profiles
          (user_id, nickname, birthday, gender, self_introduction, country_code, timezone)
        VALUES
          (:uid, :name, NULL, NULL, NULL, 'JP', 'Asia/Tokyo')
    ");
    $prof->bindValue(':uid',  $userId, PDO::PARAM_INT);
    $prof->bindValue(':name', $name,   PDO::PARAM_STR);
    $prof->execute();

    // user_rolesにINSERT（role_id=2: 一般ユーザーロール）
    $role = $pdo->prepare("
        INSERT INTO user_roles (user_id, role_id) VALUES (:uid, 2)
    ");
    $role->bindValue(':uid', $userId, PDO::PARAM_INT);
    $role->execute();

    // chat_membersにINSERT（trip_membersには追加しないことで管理人と識別）
    $mem = $pdo->prepare("
        INSERT INTO chat_members (chat_id, user_id, joined_at)
        VALUES (:chat_id, :user_id, NOW())
    ");
    $mem->bindValue(':chat_id', $chatId, PDO::PARAM_INT);
    $mem->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $mem->execute();

    $pdo->commit();

    respond([
        'success' => true,
        'message' => '登録が完了しました。ログインしてください。',
        'user_id' => $userId,
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond(['success' => false, 'message' => '登録処理に失敗しました'], 500);
}
