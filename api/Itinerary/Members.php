<?php

/**
 * 指定された旅行グループに参加しているメンバー一覧を返すAPIです。
 *
 * 主な流れ:
 * 1. セッションからログイン状態を確認する
 * 2. リクエストJSONから group_id を受け取る
 * 3. group_members と users を結合して、対象グループのメンバーID・名前を取得する
 * 4. 画面表示用に initial を付けて JSON で返す
 *
 * 返却する members の形:
 * [
 *   { id: users.user_id, name: users.name, initial: 名前の先頭1文字, role: group_members.role_in_group }
 * ]
 */

// ログイン中のユーザー情報を参照するため、セッションを開始します。
session_start();

// フロントエンドへJSONを返すAPIであることを明示します。
header("Content-Type: application/json; charset=UTF-8");

// データベース接続設定を読み込みます。ここで $pdo を使用できるようになります。
require_once __DIR__ . "/../config/db.php";

// 未ログインの場合は、メンバー情報を返さず 401 を返します。
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Login required"
    ]);
    exit;
}

// フロントエンドから送られたJSONを連想配列として読み取ります。
$input = json_decode(file_get_contents("php://input"), true);
$groupId = $input["group_id"] ?? null;

// group_id が無い場合は、どの旅行グループか判定できないため 400 を返します。
if (!$groupId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "group_id is required"
    ]);
    exit;
}

try {
    // group_members から対象グループの参加者を探し、users から表示名を取得します。
    $sql = "
    SELECT
        u.user_id AS id,
        u.name,
        gm.role_in_group
    FROM group_members gm
    INNER JOIN users u
        ON u.user_id = gm.user_id
    WHERE gm.group_id = :group_id
      AND gm.invitation_status = 'accepted'
";

    // プレースホルダーを使ってSQLインジェクションを防ぎます。
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ":group_id" => $groupId
    ]);

    $members = [];

    // フロントエンドで扱いやすい形に整形します。
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $member) {
        $name = $member["name"];

        $members[] = [
            "id" => $member["id"],
            "name" => $name,
            "initial" => mb_substr($name, 0, 1, "UTF-8"),
            "role" => $member["role_in_group"]
        ];
    }

    // 取得できたメンバー一覧を返します。0件の場合も members: [] として返します。
    echo json_encode([
        "success" => true,
        "members" => $members
    ]);
} catch (Throwable $error) {
    // DBエラーなどが起きた場合は 500 を返します。
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $error->getMessage()
    ]);
}
