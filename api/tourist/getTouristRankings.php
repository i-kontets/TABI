<?php

/**
 * 観光地の評価・レビュー件数・お気に入り件数を集計し、ランキングとして返します。
 */

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    respond(["success" => false, "message" => "GETで送信してください。"], 405);
}

$ranking = isset($_GET["ranking"]) ? trim($_GET["ranking"]) : "overall";
$prefecture = isset($_GET["prefecture"]) ? trim($_GET["prefecture"]) : "";
$keyword = isset($_GET["keyword"]) ? trim($_GET["keyword"]) : "";
$page = filter_input(INPUT_GET, "page", FILTER_VALIDATE_INT) ?: 1;
$limit = filter_input(INPUT_GET, "limit", FILTER_VALIDATE_INT) ?: 20;
$allowedRankings = ["overall", "rating", "favorite"];

if (!in_array($ranking, $allowedRankings, true)) {
    respond(["success" => false, "message" => "ランキング種別が正しくありません。"], 400);
}

if ($page < 1 || $limit < 1 || $limit > 100) {
    respond(["success" => false, "message" => "ページまたは取得件数が正しくありません。"], 400);
}

try {
    $prefectureStmt = $pdo->query(
        "SELECT DISTINCT prefecture
         FROM tourist_spots
         WHERE prefecture IS NOT NULL AND prefecture <> ''
         ORDER BY prefecture ASC"
    );
    $prefectures = $prefectureStmt->fetchAll(PDO::FETCH_COLUMN);

    $globalAverageStmt = $pdo->query("SELECT AVG(rating) FROM reviews");
    $globalAverage = $globalAverageStmt->fetchColumn();
    $globalAverage = $globalAverage === null ? 0.0 : (float) $globalAverage;

    $conditions = [];
    $parameters = [];

    if ($prefecture !== "") {
        $conditions[] = "spot.prefecture = :prefecture";
        $parameters[":prefecture"] = $prefecture;
    }

    if ($keyword !== "") {
        $conditions[] = "(
            spot.name LIKE :keyword_name
            OR spot.city LIKE :keyword_city
            OR spot.category LIKE :keyword_category
            OR spot.type LIKE :keyword_type
        )";
        $keywordLike = "%" . $keyword . "%";
        $parameters[":keyword_name"] = $keywordLike;
        $parameters[":keyword_city"] = $keywordLike;
        $parameters[":keyword_category"] = $keywordLike;
        $parameters[":keyword_type"] = $keywordLike;
    }

    $whereClause = count($conditions) > 0
        ? "WHERE " . implode(" AND ", $conditions)
        : "";

    $stmt = $pdo->prepare("
        SELECT
            spot.tourist_spot_id,
            spot.osm_type,
            spot.osm_id,
            spot.name,
            spot.prefecture,
            spot.city,
            spot.address,
            spot.description,
            spot.category,
            spot.type,
            spot.lat,
            spot.lon,
            spot.image_url,
            spot.source,
            spot.osm_updated_at,
            spot.created_at,
            spot.updated_at,
            review_summary.average_rating,
            COALESCE(review_summary.review_count, 0) AS review_count,
            COALESCE(favorite_summary.favorite_count, 0) AS favorite_count
        FROM tourist_spots AS spot
        LEFT JOIN (
            SELECT tourist_spot_id, AVG(rating) AS average_rating, COUNT(*) AS review_count
            FROM reviews
            GROUP BY tourist_spot_id
        ) AS review_summary
            ON review_summary.tourist_spot_id = spot.tourist_spot_id
        LEFT JOIN (
            SELECT tourist_spot_id, COUNT(*) AS favorite_count
            FROM favorites
            GROUP BY tourist_spot_id
        ) AS favorite_summary
            ON favorite_summary.tourist_spot_id = spot.tourist_spot_id
        {$whereClause}
    ");
    $stmt->execute($parameters);
    $spots = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $maximumReviewCount = 0;
    $maximumFavoriteCount = 0;

    foreach ($spots as $spot) {
        $maximumReviewCount = max($maximumReviewCount, (int) $spot["review_count"]);
        $maximumFavoriteCount = max($maximumFavoriteCount, (int) $spot["favorite_count"]);
    }

    $priorWeight = 5.0;

    foreach ($spots as &$spot) {
        $reviewCount = (int) $spot["review_count"];
        $favoriteCount = (int) $spot["favorite_count"];
        $averageRating = $spot["average_rating"] === null ? null : (float) $spot["average_rating"];
        $ratingForCalculation = $averageRating ?? $globalAverage;
        $adjustedRating = (($reviewCount / ($reviewCount + $priorWeight)) * $ratingForCalculation)
            + (($priorWeight / ($reviewCount + $priorWeight)) * $globalAverage);
        $reviewVolume = $maximumReviewCount > 0
            ? log(1 + $reviewCount) / log(1 + $maximumReviewCount)
            : 0.0;
        $favoriteVolume = $maximumFavoriteCount > 0
            ? log(1 + $favoriteCount) / log(1 + $maximumFavoriteCount)
            : 0.0;

        $spot["tourist_spot_id"] = (int) $spot["tourist_spot_id"];
        $spot["osm_id"] = $spot["osm_id"] === null ? null : (int) $spot["osm_id"];
        $spot["lat"] = $spot["lat"] === null ? null : (float) $spot["lat"];
        $spot["lon"] = $spot["lon"] === null ? null : (float) $spot["lon"];
        $spot["average_rating"] = $averageRating === null ? null : round($averageRating, 1);
        $spot["review_count"] = $reviewCount;
        $spot["favorite_count"] = $favoriteCount;
        $spot["adjusted_rating"] = $reviewCount === 0 ? 0.0 : $adjustedRating;
        $spot["overall_score"] = round(
            (($adjustedRating / 5) * 70) + ($reviewVolume * 15) + ($favoriteVolume * 15),
            2
        );
    }
    unset($spot);

    usort($spots, static function (array $left, array $right) use ($ranking): int {
        if ($ranking === "favorite") {
            return ($right["favorite_count"] <=> $left["favorite_count"])
                ?: ($right["review_count"] <=> $left["review_count"])
                ?: (($right["average_rating"] ?? 0) <=> ($left["average_rating"] ?? 0))
                ?: ($left["tourist_spot_id"] <=> $right["tourist_spot_id"]);
        }

        if ($ranking === "rating") {
            return (($right["review_count"] > 0) <=> ($left["review_count"] > 0))
                ?: ($right["adjusted_rating"] <=> $left["adjusted_rating"])
                ?: ($right["review_count"] <=> $left["review_count"])
                ?: (($right["average_rating"] ?? 0) <=> ($left["average_rating"] ?? 0))
                ?: ($right["favorite_count"] <=> $left["favorite_count"])
                ?: ($left["tourist_spot_id"] <=> $right["tourist_spot_id"]);
        }

        return ($right["overall_score"] <=> $left["overall_score"])
            ?: ($right["review_count"] <=> $left["review_count"])
            ?: ($right["favorite_count"] <=> $left["favorite_count"])
            ?: ($left["tourist_spot_id"] <=> $right["tourist_spot_id"]);
    });

    $total = count($spots);
    $totalPages = $total === 0 ? 0 : (int) ceil($total / $limit);
    $offset = ($page - 1) * $limit;
    $pageSpots = array_slice($spots, $offset, $limit);

    foreach ($pageSpots as $index => &$spot) {
        $spot["rank"] = $offset + $index + 1;
        unset($spot["adjusted_rating"]);
    }
    unset($spot);

    respond([
        "success" => true,
        "ranking" => $ranking,
        "conditions" => [
            "prefecture" => $prefecture,
            "keyword" => $keyword,
        ],
        "pagination" => [
            "page" => $page,
            "limit" => $limit,
            "total" => $total,
            "total_pages" => $totalPages,
        ],
        "filters" => [
            "prefectures" => $prefectures,
        ],
        "spots" => $pageSpots,
    ]);
} catch (PDOException $error) {
    error_log($error->getMessage());
    respond([
        "success" => false,
        "message" => "観光地ランキングの取得に失敗しました。",
        "ranking" => $ranking,
        "conditions" => ["prefecture" => $prefecture, "keyword" => $keyword],
        "pagination" => ["page" => $page, "limit" => $limit, "total" => 0, "total_pages" => 0],
        "filters" => ["prefectures" => []],
        "spots" => [],
    ], 500);
}
