<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/../config/db.php";

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'faq_items' LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $items = $row ? json_decode((string) $row["setting_value"], true) : [];
    if (!is_array($items)) {
        $items = [];
    }

    $keyword = trim((string) ($_GET["keyword"] ?? ""));
    $category = trim((string) ($_GET["category"] ?? ""));

    $items = array_values(array_filter($items, function ($item) use ($keyword, $category) {
        if (!is_array($item)) {
            return false;
        }
        if ($category !== "" && ($item["category"] ?? "") !== $category) {
            return false;
        }
        if ($keyword === "") {
            return true;
        }
        $text = ($item["question"] ?? "") . " " . ($item["answer"] ?? "");
        return mb_stripos($text, $keyword) !== false;
    }));

    respond(["success" => true, "items" => $items]);
} catch (Throwable $error) {
    respond(["success" => false, "message" => "FAQの取得に失敗しました。"], 500);
}
