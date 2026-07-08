<?php

function handle_admin_get(PDO $pdo, string $resource, $id): void
{
    // resource ごとに呼ぶ取得関数を切り替えます。
    $items = [
        "users" => fn() => fetch_users($pdo),
        "groups" => fn() => fetch_groups($pdo),
        "posts" => fn() => fetch_posts($pdo),
        "reports" => fn() => fetch_reports($pdo),
        "inquiries" => fn() => fetch_inquiries($pdo),
        "notices" => fn() => fetch_notices($pdo),
        "spots" => fn() => fetch_spots($pdo),
        "managers" => fn() => fetch_managers($pdo),
        "logs" => fn() => fetch_logs($pdo),
    ][$resource] ?? null;
    $items = $items ? $items() : null;

    // analytics は一覧ではなく、ダッシュボード向けの集計データを返します。
    if ($resource === "analytics") {
        $users = fetch_users($pdo);
        $groups = fetch_groups($pdo);
        $posts = fetch_posts($pdo);
        $reports = fetch_reports($pdo);
        $inquiries = fetch_inquiries($pdo);

        $todayActiveUsers = fetch_today_active_users($pdo);
        $activeUserTrend = fetch_active_user_trend($pdo);
        $notificationPermissions = fetch_notification_permissions($pdo);

        respond([
            "summary" => [
                "newUsers" => ["value" => count($users), "diff" => 0],
                "newGroups" => ["value" => count($groups), "diff" => 0],
                "activeUsers" => ["value" => $todayActiveUsers, "diff" => 0],
                "pendingInquiries" => count(array_filter($inquiries, fn($i) => $i["status"] === "未対応")),
                "pendingReports" => count(array_filter($reports, fn($r) => $r["status"] === "未対応")),
                "systemErrors" => 0,
                "totalUsers" => count($users),
            ],
            "activeUserTrend" => $activeUserTrend,
            "notificationPermissions" => $notificationPermissions,
            "userAttributes" => $notificationPermissions,
            "usage" => [
                "newUsers7d" => count($users),
                "groupsCreated7d" => count($groups),
                "posts7d" => count($posts),
                "uploads7d" => 0,
            ],
            "featureRanking" => [
                ["name" => "話し合い", "count" => count($posts)],
                ["name" => "グループ", "count" => count($groups)],
                ["name" => "お問い合わせ", "count" => count($inquiries)],
            ],
        ]);
    }

    // activities はダッシュボード向けに最近の出来事をまとめて返します。
    if ($resource === "activities") {
        respond(fetch_recent_activities($pdo));
    }

    // 通報件数の状態別集計だけを返す専用エンドポイントです。
    if ($resource === "reports-counts") {
        $reports = fetch_reports($pdo);
        respond([
            "未対応" => count(array_filter($reports, fn($r) => $r["status"] === "未対応")),
            "確認中" => count(array_filter($reports, fn($r) => $r["status"] === "確認中")),
            "対応済み" => count(array_filter($reports, fn($r) => $r["status"] === "対応済み")),
        ]);
    }

    // お問い合わせ件数の状態別集計だけを返します。
    if ($resource === "inquiries-counts") {
        $inquiries = fetch_inquiries($pdo);
        respond([
            "未対応" => count(array_filter($inquiries, fn($i) => $i["status"] === "未対応")),
            "対応中" => count(array_filter($inquiries, fn($i) => $i["status"] === "対応中")),
            "対応済み" => count(array_filter($inquiries, fn($i) => $i["status"] === "対応済み")),
        ]);
    }

    // resource が既知でない場合は、対応していないとして 404 を返します。
    if (!is_array($items)) {
        respond(["success" => false, "message" => "Unknown resource."], 404);
    }

    // id があれば一覧ではなく単体データを返します。
    if ($id !== null) {
        $found = current(array_filter($items, fn($item) => (string) $item["id"] === (string) $id));
        respond($found ?: null);
    }

    // ここから下は、一覧データを画面表示用に整える後処理です。
    // まず検索条件を読み取り、その後に必要な絞り込みや並び替えを順番にかけます。
    $query = trim($_GET["query"] ?? "");
    $status = trim($_GET["status"] ?? "");
    $category = trim($_GET["category"] ?? "");
    $prefecture = trim($_GET["prefecture"] ?? "");
    // キーワード検索は、各項目を JSON にして文字列として部分一致を確認します。
    // 複数の項目を横断して探したいときに、個別のカラムを意識せず絞り込めます。
    if ($query !== "") {
        $items = array_values(array_filter($items, fn($item) => strpos(json_encode($item, JSON_UNESCAPED_UNICODE), $query) !== false));
    }
    // status が指定されたときは、一覧の状態ラベルが一致するものだけ残します。
    if ($status !== "") {
        $items = array_values(array_filter($items, fn($item) => ($item["status"] ?? "") === $status));
    }
    // category は「すべて」を除外して、実際に選ばれた分類だけを残します。
    if ($category !== "" && $category !== "すべて") {
        $items = array_values(array_filter($items, fn($item) => ($item["category"] ?? "") === $category));
    }
    // prefecture も同じ考え方で、観光スポットなどの都道府県絞り込みに使います。
    if ($prefecture !== "" && $prefecture !== "すべて") {
        $items = array_values(array_filter($items, fn($item) => ($item["prefecture"] ?? "") === $prefecture));
    }
    // users 一覧だけは、通常の新しい順ではなく、管理画面用の独自ルールで並び替えます。
    if ($resource === "users") {
        $items = sort_admin_users($items, trim($_GET["sort"] ?? ""));
    }

    // 一覧ごとに 1 ページあたりの件数を決めて、フロントが受け取りやすい形に整えます。
    $perPage = $resource === "users" || $resource === "logs" ? 10 : 20;
    // page_result で現在ページのスライス、総ページ数、総件数をまとめて返します。
    respond(page_result($items, (int) ($_GET["page"] ?? 1), $perPage));
}
