<?php

/**
 * 観光スポットの取得とお気に入り登録・解除を扱う API です。
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

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "GETで送信してください。",
        "favorites" => [],
    ], 405);
}

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if (!isset($_SESSION["user_id"])) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "ログインしてください。",
        "favorites" => [],
    ], 401);
}

$userId = (int) $_SESSION["user_id"];

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT
            f.favorite_id,
            f.created_at AS favorited_at,
            s.tourist_spot_id,
            s.osm_type,
            s.osm_id,
            s.name,
            s.prefecture,
            s.city,
            s.address,
            s.description,
            s.category,
            s.type,
            s.lat,
            s.lon,
            s.image_url,
            s.source,
            s.osm_updated_at,
            s.created_at,
            s.updated_at
        FROM favorites f
        INNER JOIN tourist_spots s
            ON f.tourist_spot_id = s.tourist_spot_id
        WHERE f.user_id = :user_id
        ORDER BY f.created_at DESC, f.favorite_id DESC
    ");

    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        ":user_id" => $userId,
    ]);

    $favorites = array_map(static function (array $favorite): array {
        return [
            "favorite_id" => (int) $favorite["favorite_id"],
            "favorited_at" => $favorite["favorited_at"],
            "tourist_spot_id" => (int) $favorite["tourist_spot_id"],
            "osm_type" => $favorite["osm_type"],
            "osm_id" => $favorite["osm_id"] === null ? null : (int) $favorite["osm_id"],
            "name" => $favorite["name"],
            "prefecture" => $favorite["prefecture"],
            "city" => $favorite["city"],
            "address" => $favorite["address"],
            "description" => $favorite["description"],
            "category" => $favorite["category"],
            "type" => $favorite["type"],
            "lat" => $favorite["lat"] === null ? null : (float) $favorite["lat"],
            "lon" => $favorite["lon"] === null ? null : (float) $favorite["lon"],
            "image_url" => $favorite["image_url"],
            "source" => $favorite["source"],
            "osm_updated_at" => $favorite["osm_updated_at"],
            "created_at" => $favorite["created_at"],
            "updated_at" => $favorite["updated_at"],
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "message" => count($favorites) > 0 ? "" : "お気に入りはまだありません。",
        "favorites" => $favorites,
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    error_log($error->getMessage());

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "お気に入り一覧の取得に失敗しました。",
        "favorites" => [],
    ], 500);
}
