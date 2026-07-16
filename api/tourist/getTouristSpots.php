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
        "city" => "",
        "spots" => [],
    ], 405);
}

$city = isset($_GET["city"]) ? trim($_GET["city"]) : "";

// ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
if ($city === "") {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "地域名を入力してください。",
        "city" => "",
        "spots" => [],
    ], 400);
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT
            tourist_spot_id,
            osm_type,
            osm_id,
            name,
            prefecture,
            city,
            address,
            description,
            category,
            type,
            lat,
            lon,
            image_url,
            source,
            osm_updated_at,
            created_at,
            updated_at
        FROM tourist_spots
        WHERE city LIKE :locationKeyword
            OR prefecture LIKE :locationKeyword
            OR name LIKE :keyword
            OR category LIKE :keyword
            OR type LIKE :keyword
        ORDER BY name ASC, tourist_spot_id ASC
    ");

    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute([
        ":locationKeyword" => $city . "%",
        ":keyword" => "%" . $city . "%",
    ]);

    $spots = array_map(static function (array $spot): array {
        return [
            "tourist_spot_id" => (int) $spot["tourist_spot_id"],
            "osm_type" => $spot["osm_type"],
            "osm_id" => $spot["osm_id"] === null ? null : (int) $spot["osm_id"],
            "name" => $spot["name"],
            "prefecture" => $spot["prefecture"],
            "city" => $spot["city"],
            "address" => $spot["address"],
            "description" => $spot["description"],
            "category" => $spot["category"],
            "type" => $spot["type"],
            "lat" => (float) $spot["lat"],
            "lon" => (float) $spot["lon"],
            "image_url" => $spot["image_url"],
            "source" => $spot["source"],
            "osm_updated_at" => $spot["osm_updated_at"],
            "created_at" => $spot["created_at"],
            "updated_at" => $spot["updated_at"],
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => true,
        "message" => count($spots) > 0 ? "" : "該当する観光地がありません。",
        "city" => $city,
        "spots" => $spots,
    ]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (PDOException $error) {
    error_log($error->getMessage());

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond([
        "success" => false,
        "message" => "観光地データの取得に失敗しました。",
        "city" => $city,
        "spots" => [],
    ], 500);
}
