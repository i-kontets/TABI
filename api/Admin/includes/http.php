<?php


// どの処理でも共通して使う JSON 応答関数です。
// HTTP ステータスを設定してから JSON を返し、必ず exit で処理を止めます。
function respond($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// リクエストボディを JSON として読み取るための関数です。
// POST や PATCH で送られてくる本文を、配列として扱える形に整えます。
function body(): array
{
    $raw = file_get_contents("php://input");
    if ($raw === false || $raw === "") {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// 配列データをページング付きのレスポンスにまとめる関数です。
// 件数が多い一覧を、フロント側で扱いやすい形にします。
function page_result(array $items, int $page, int $perPage = 20): array
{
    $total = count($items);
    $totalPages = max(1, (int) ceil($total / $perPage));
    $safePage = min(max(1, $page), $totalPages);

    return [
        "items" => array_slice($items, ($safePage - 1) * $perPage, $perPage),
        "page" => $safePage,
        "totalPages" => $totalPages,
        "total" => $total,
    ];
}

// DB の日時文字列を画面表示向けに整形します。
