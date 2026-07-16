<?php

/**
 * 旅行グループの作成、一覧、メンバー、画像アップロードを扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッションを開始し、ログイン中のユーザー情報をサーバー側で使えるようにします。
session_start();

// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "Login required"
    ]);
    exit;
}

// フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
$input = json_decode(file_get_contents("php://input"), true);
$groupId = $input["group_id"] ?? null;

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!$groupId) {
    http_response_code(400);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => "group_id is required"
    ]);
    exit;
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    $sql = "
    SELECT
        u.user_id AS id,
        u.name
    FROM group_members gm
    INNER JOIN users u
        ON u.user_id = gm.user_id
    WHERE gm.group_id = :group_id
";

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare($sql);
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        ":group_id" => $groupId
    ]);

    $members = [];

    // 複数のデータを1件ずつ取り出し、同じ確認や変換を繰り返します。
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $member) {
        $name = $member["name"];

        $members[] = [
            "id" => $member["id"],
            "name" => $name,
            "initial" => mb_substr($name, 0, 1, "UTF-8")
        ];
    }

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => true,
        "members" => $members
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    http_response_code(500);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode([
        "success" => false,
        "message" => $error->getMessage()
    ]);
}