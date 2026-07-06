<?php
// 管理画面向けの共通 API エンドポイントです。
// 1 ファイルの中で、一覧取得・詳細取得・更新・削除・外部送信までをまとめて処理します。

// 成功・失敗を問わず、API の返却形式を統一するための共通関数です。
// HTTP ステータスを先に設定し、JSON にして返したあと、以降の処理を止めます。

// リクエストボディを JSON として読み取るための関数です。
// POST / PATCH のように、本文で値を送る API で使います。

// 一覧データをページングするための共通処理です。
// 返却件数、現在ページ、総ページ数、総件数をまとめて返します。

// DB などの日時文字列を画面表示向けに整形します。
// 例: 2026-07-06 12:34:56 -> 2026/07/06 12:34

// users.status を管理画面表示用の日本語ラベルに変換します。
// DB 上のコード値と UI 表示を切り離すための変換表です。

// お知らせの状態を表示用ラベルに変換します。

// 通報の状態を表示用ラベルに変換します。

// お問い合わせの状態を表示用ラベルに変換します。

// 表示ラベルから DB 保存用コードへ戻すための共通関数です。
// 画面側の文言を使いながら、内部ではコード値で統一したいときに使います。

// config/db.php で読み込んだ設定や環境変数を、ここから参照しやすくするためのラッパーです。
// 配列の設定値を優先し、なければ環境変数、最後にデフォルト値を返します。

// Google Apps Script に JSON を POST するための汎用関数です。
// cURL が使える環境では cURL を優先し、ない場合は file_get_contents で送ります。

// お問い合わせ返信を GAS 経由で送るための専用関数です。
// 返信メールの送信処理を PHP 側に閉じ込めず、外部の GAS に委譲しています。

// ユーザー一覧を取得し、管理画面でそのまま表示しやすい形に整形します。
// プロフィール、グループ数、投稿数、最終ログインなどをまとめて取ります。

// グループ一覧を取得します。
// メンバー数、旅行日程、アイテム数、アルバム数など、管理画面で見たい指標も一緒に集計します。

// 投稿一覧を取得します。
// どのグループ・どのチャット種別に属するか、通報件数がいくつかも同時に返します。

// 通報一覧を取得します。
// 通報対象ユーザー、通報者、通報理由、管理メモなどをまとめて返します。

// お問い合わせ一覧を取得します。
// ユーザー名とメールアドレスも添えて、返信に必要な情報をそのまま扱えるようにします。

// お知らせ一覧を取得します。
// 削除済みを除外して、公開状態や配信期間が分かる形に整形します。

// 観光スポット一覧を取得します。
// 位置情報や公開状態も返し、管理画面で地図や一覧に使えるようにします。

// 管理者一覧を取得します。
// 権限レベルを役割名に変換し、最終ログイン日時も表示できるようにします。

// 管理操作ログを取得します。
// 誰が何をしたかを時系列で追えるようにする監査用データです。

// クエリ文字列から対象リソースや ID を受け取ります。
// resource で一覧種別を選び、id があれば詳細や単体更新に使います。

    // GET は基本的に一覧取得か、単体取得、もしくは集計系の返却に使います。

    // resource ごとに、呼ぶ取得関数を切り替えます。

    // analytics は一覧ではなくダッシュボード向けの集計値を返します。

    // activities は操作ログをそのまま返します。

    // 通報数の内訳だけが欲しいときの専用レスポンスです。

    // お問い合わせ数の内訳だけが欲しいときの専用レスポンスです。

    // resource に対応する取得先がない場合は 404 相当で返します。

    // id がある場合は一覧ではなく単体を返します。

    // 一覧に対して、検索・絞り込み・ページングを順番に適用します。

    // POST は新規作成や外部送信など、状態を増やす処理に使います。

    // お知らせを新規作成します。

    // 観光スポットを新規登録します。

    // 管理者ユーザーを新規作成します。
    // users と admin_users の 2 テーブルに分けて登録するため、トランザクションでまとめます。

    // PATCH は既存データの状態変更に使います。

    // action で削除・停止・公開切り替えなどの細かい挙動を分けています。

    // ユーザーの停止または退会処理です。

    // 投稿の非表示切り替え、または管理画面上の削除です。

    // 通報の状態と管理メモを更新します。

    // お問い合わせの状態とメモを更新します。

    // お知らせの内容を更新します。

    // スポット情報を更新します。

    // 管理者の権限状態を切り替えます。

    // DELETE は論理削除のような「見えなくする」操作に使っています。

    // お知らせの削除は削除フラグを立てる方式です。

    // スポットの削除も同じく論理削除です。

    // お問い合わせ返信は、DB 更新だけでなく GAS への送信も伴う特別な処理です。

    // 返信対象のお問い合わせを取得し、必要な送信先情報を揃えます。

    // GAS にメール送信を依頼し、結果を受け取ります。

    // 送信履歴を replies テーブルに保存します。

    // 返信後は、お問い合わせ本体の状態や管理メモも更新します。

    // どの分岐にも当てはまらない場合は、対応していない操作として返します。

    // 途中で例外が起きたら、トランザクション中なら必ず巻き戻して整合性を保ちます。

    // 失敗理由を JSON で返し、フロント側からも確認できるようにします。


require_once __DIR__ . "/../config/db.php";

function respond($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array
{
    $raw = file_get_contents("php://input");
    if ($raw === false || $raw === "") {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

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

function format_dt(?string $value): string
{
    if (!$value) {
        return "-";
    }
    return str_replace("-", "/", substr($value, 0, 16));
}

function user_status_label(?string $status): string
{
    return [
        "suspended" => "停止中",
        "deleted" => "退会済み",
    ][$status] ?? "通常";
}

function notice_status_label(?string $status): string
{
    return [
        "ended" => "終了",
        "draft" => "下書き",
    ][$status] ?? "公開中";
}

function report_status_label(?string $status): string
{
    return [
        "reviewing" => "確認中",
        "resolved" => "対応済み",
    ][$status] ?? "未対応";
}

function inquiry_status_label(?string $status): string
{
    return [
        "working" => "対応中",
        "resolved" => "対応済み",
    ][$status] ?? "未対応";
}

function to_status_code(string $label, array $map, string $default): string
{
    return $map[$label] ?? $default;
}

function app_config(string $key, $default = null)
{
    global $config;
    if (!empty($config[$key])) {
        return $config[$key];
    }
    $envValue = getenv($key);
    return $envValue !== false && $envValue !== "" ? $envValue : $default;
}

function post_json(string $url, array $payload): array
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);

    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
        ]);
        $body = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false) {
            throw new RuntimeException("GAS送信に失敗しました: " . $error);
        }

        return ["status" => $status, "body" => $body];
    }

    $context = stream_context_create([
        "http" => [
            "method" => "POST",
            "header" => "Content-Type: application/json\r\n",
            "content" => $json,
            "timeout" => 15,
            "ignore_errors" => true,
        ],
    ]);
    $body = file_get_contents($url, false, $context);
    $status = 0;
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    if ($body === false) {
        throw new RuntimeException("GAS送信に失敗しました。");
    }

    return ["status" => $status, "body" => $body];
}

function send_inquiry_reply_via_gas(array $inquiry, string $message): array
{
    $gasUrl = app_config("GAS_INQUIRY_REPLY_URL", "");
    $gasToken = app_config("GAS_INQUIRY_REPLY_TOKEN", "");

    if (!$gasUrl) {
        throw new RuntimeException("GAS_INQUIRY_REPLY_URLが設定されていません。GASをWebアプリとしてデプロイし、/exec のURLを設定してください。");
    }

    $response = post_json($gasUrl, [
        "token" => $gasToken,
        "inquiryId" => $inquiry["public_id"],
        "to" => $inquiry["email"],
        "userName" => $inquiry["user_name"],
        "title" => $inquiry["title"],
        "category" => $inquiry["category"],
        "originalBody" => $inquiry["body"],
        "replyBody" => $message,
    ]);
    $decoded = json_decode($response["body"], true);

    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("GASがHTTP " . $response["status"] . "を返しました。");
    }
    if (is_array($decoded) && isset($decoded["ok"]) && !$decoded["ok"]) {
        throw new RuntimeException($decoded["message"] ?? "GAS側で送信に失敗しました。");
    }

    return $response;
}

function fetch_users(PDO $pdo): array
{
    $sql = "
        SELECT
            u.user_id,
            u.name,
            u.email,
            u.status,
            u.created_at,
            u.deleted_at,
            p.gender,
            p.birthday,
            p.self_introduction,
            MAX(d.last_login_at) AS last_login_at,
            COUNT(DISTINCT gm.group_id) AS group_count,
            COUNT(DISTINCT m.message_id) AS post_count
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.user_id
        LEFT JOIN user_devices d ON d.user_id = u.user_id
        LEFT JOIN group_members gm ON gm.user_id = u.user_id AND gm.invitation_status = 'accepted'
        LEFT JOIN messages m ON m.sender_user_id = u.user_id AND m.admin_deleted_at IS NULL
        GROUP BY u.user_id, u.name, u.email, u.status, u.created_at, u.deleted_at, p.gender, p.birthday, p.self_introduction
        ORDER BY u.user_id DESC
    ";
    $rows = $pdo->query($sql)->fetchAll();

    return array_map(function ($row) {
        return [
            "id" => (int) $row["user_id"],
            "name" => $row["name"],
            "email" => $row["email"],
            "status" => user_status_label($row["status"]),
            "registeredAt" => format_dt($row["created_at"]),
            "lastLoginAt" => format_dt($row["last_login_at"]),
            "age" => "-",
            "gender" => $row["gender"] ?: "-",
            "emailVerified" => true,
            "phone" => "-",
            "bio" => $row["self_introduction"] ?: "",
            "groupCount" => (int) $row["group_count"],
            "postCount" => (int) $row["post_count"],
        ];
    }, $rows);
}

function fetch_groups(PDO $pdo): array
{
    $groups = $pdo->query("
        SELECT
            g.group_id,
            g.group_name,
            g.status,
            g.created_at,
            creator.name AS creator,
            COUNT(DISTINCT gm.user_id) AS member_count,
            COUNT(DISTINCT i.itinerary_id) AS itinerary_count,
            COUNT(DISTINCT ii.itinerary_item_id) AS schedule_count,
            COUNT(DISTINCT a.album_id) AS album_count,
            MIN(t.start_date) AS start_date,
            MAX(t.end_date) AS end_date
        FROM user_groups g
        LEFT JOIN users creator ON creator.user_id = g.created_by
        LEFT JOIN group_members gm ON gm.group_id = g.group_id AND gm.invitation_status = 'accepted'
        LEFT JOIN trips t ON t.group_id = g.group_id
        LEFT JOIN itineraries i ON i.trip_id = t.trip_id
        LEFT JOIN itinerary_items ii ON ii.itinerary_id = i.itinerary_id
        LEFT JOIN albums a ON a.trip_id = t.trip_id
        GROUP BY g.group_id, g.group_name, g.status, g.created_at, creator.name
        ORDER BY g.group_id DESC
    ")->fetchAll();

    $memberStmt = $pdo->prepare("
        SELECT u.user_id, u.name, gm.role_in_group
        FROM group_members gm
        INNER JOIN users u ON u.user_id = gm.user_id
        WHERE gm.group_id = :group_id AND gm.invitation_status = 'accepted'
        ORDER BY gm.group_member_id
    ");

    return array_map(function ($row) use ($memberStmt) {
        $memberStmt->execute(["group_id" => $row["group_id"]]);
        $members = array_map(fn($member) => [
            "id" => (int) $member["user_id"],
            "name" => $member["name"],
            "role" => $member["role_in_group"] === "admin" ? "リーダー" : "メンバー",
        ], $memberStmt->fetchAll());

        $period = ($row["start_date"] && $row["end_date"])
            ? $row["start_date"] . " - " . $row["end_date"]
            : "日程未定";

        return [
            "id" => "g" . $row["group_id"],
            "name" => $row["group_name"],
            "status" => $row["status"] === "active" ? "公開中" : "準備中",
            "creator" => $row["creator"] ?: "-",
            "createdAt" => format_dt($row["created_at"]),
            "period" => $period,
            "memberCount" => (int) $row["member_count"],
            "itineraryCount" => (int) $row["itinerary_count"],
            "scheduleCount" => (int) $row["schedule_count"],
            "albumCount" => (int) $row["album_count"],
            "members" => $members,
        ];
    }, $groups);
}

function fetch_posts(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT
            m.message_id,
            m.body,
            m.sent_at,
            m.admin_visibility_status,
            u.user_id,
            u.name AS author,
            g.group_id,
            g.group_name,
            c.chat_type,
            COUNT(DISTINCT r.report_id) AS report_count
        FROM messages m
        LEFT JOIN users u ON u.user_id = m.sender_user_id
        LEFT JOIN chats c ON c.chat_id = m.chat_id
        LEFT JOIN trips t ON t.trip_id = c.trip_id
        LEFT JOIN user_groups g ON g.group_id = t.group_id
        LEFT JOIN admin_reports r ON r.target_message_id = m.message_id
        WHERE m.admin_deleted_at IS NULL
        GROUP BY m.message_id, m.body, m.sent_at, m.admin_visibility_status, u.user_id, u.name, g.group_id, g.group_name, c.chat_type
        ORDER BY m.sent_at DESC, m.message_id DESC
    ")->fetchAll();

    return array_map(fn($row) => [
        "id" => "p" . $row["message_id"],
        "body" => $row["body"] ?: "",
        "author" => $row["author"] ?: "-",
        "authorId" => (int) $row["user_id"],
        "group" => $row["group_name"] ?: "-",
        "groupId" => $row["group_id"] ? "g" . $row["group_id"] : "",
        "category" => $row["chat_type"] === "hotel" ? "宿泊候補" : "旅行先候補",
        "createdAt" => format_dt($row["sent_at"]),
        "likes" => 0,
        "replies" => 0,
        "reportCount" => (int) $row["report_count"],
        "status" => $row["admin_visibility_status"] === "hidden" ? "非表示" : "公開中",
    ], $rows);
}

function fetch_reports(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT
            r.*,
            target.name AS target_name,
            reporter.name AS reporter_name,
            m.body AS target_body
        FROM admin_reports r
        LEFT JOIN users target ON target.user_id = r.target_user_id
        LEFT JOIN users reporter ON reporter.user_id = r.reporter_user_id
        LEFT JOIN messages m ON m.message_id = r.target_message_id
        ORDER BY r.reported_at DESC, r.report_id DESC
    ")->fetchAll();

    return array_map(fn($row) => [
        "id" => "r" . $row["report_id"],
        "type" => $row["report_type"],
        "status" => report_status_label($row["status"]),
        "target" => $row["target_name"] ?: "-",
        "targetId" => (int) $row["target_user_id"],
        "targetPostId" => $row["target_message_id"] ? "p" . $row["target_message_id"] : null,
        "reporter" => $row["reporter_name"] ?: "-",
        "reporterId" => (int) $row["reporter_user_id"],
        "reason" => $row["reason"],
        "detail" => $row["detail"] ?: ($row["target_body"] ?: ""),
        "note" => $row["admin_note"] ?: "",
        "reportedAt" => format_dt($row["reported_at"]),
    ], $rows);
}

function fetch_inquiries(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT i.*, u.name AS user_name, u.email
        FROM admin_inquiries i
        LEFT JOIN users u ON u.user_id = i.user_id
        ORDER BY i.created_at DESC, i.inquiry_id DESC
    ")->fetchAll();

    return array_map(fn($row) => [
        "id" => $row["public_id"],
        "title" => $row["title"],
        "status" => inquiry_status_label($row["status"]),
        "user" => $row["user_name"] ?: "-",
        "userId" => (int) $row["user_id"],
        "userEmail" => $row["email"] ?: "",
        "category" => $row["category"],
        "body" => $row["body"],
        "hasAttachment" => (bool) $row["has_attachment"],
        "createdAt" => format_dt($row["created_at"]),
        "memo" => $row["admin_memo"] ?: "",
    ], $rows);
}

function fetch_notices(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT *
        FROM admin_notices
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC, notice_id DESC
    ")->fetchAll();

    return array_map(fn($row) => [
        "id" => "n" . $row["notice_id"],
        "title" => $row["title"],
        "body" => $row["body"],
        "target" => $row["target_type"],
        "status" => notice_status_label($row["status"]),
        "startAt" => format_dt($row["start_at"]),
        "endAt" => format_dt($row["end_at"]),
        "push" => (bool) $row["push_enabled"],
        "readRate" => (int) $row["read_rate"],
    ], $rows);
}

function fetch_spots(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT *
        FROM admin_spots
        WHERE deleted_at IS NULL
        ORDER BY spot_id DESC
    ")->fetchAll();

    return array_map(fn($row) => [
        "id" => "s" . $row["spot_id"],
        "name" => $row["name"],
        "category" => $row["category"],
        "prefecture" => $row["prefecture"],
        "address" => $row["address"] ?: "",
        "lat" => (float) $row["latitude"],
        "lng" => (float) $row["longitude"],
        "status" => $row["status"] === "hidden" ? "非公開" : "公開中",
    ], $rows);
}

function fetch_managers(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT au.admin_user_id, au.admin_level, au.created_at, u.user_id, u.name, u.email, u.status, MAX(d.last_login_at) AS last_login_at
        FROM admin_users au
        INNER JOIN users u ON u.user_id = au.user_id
        LEFT JOIN user_devices d ON d.user_id = u.user_id
        GROUP BY au.admin_user_id, au.admin_level, au.created_at, u.user_id, u.name, u.email, u.status
        ORDER BY au.admin_level DESC, au.admin_user_id
    ")->fetchAll();

    return array_map(fn($row) => [
        "id" => "m" . $row["admin_user_id"],
        "name" => $row["name"],
        "role" => (int) $row["admin_level"] >= 9 ? "オーナー" : ((int) $row["admin_level"] >= 5 ? "管理者" : "閲覧のみ"),
        "email" => $row["email"],
        "lastLoginAt" => format_dt($row["last_login_at"]),
        "status" => $row["status"] === "suspended" ? "停止中" : "通常",
    ], $rows);
}

function fetch_logs(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT l.*, u.name AS manager_name
        FROM admin_activity_logs l
        LEFT JOIN users u ON u.user_id = l.manager_user_id
        ORDER BY l.created_at DESC, l.activity_log_id DESC
    ")->fetchAll();

    return array_map(fn($row) => [
        "id" => "l" . $row["activity_log_id"],
        "at" => format_dt($row["created_at"]),
        "manager" => $row["manager_name"] ?: "システム",
        "action" => $row["action_text"],
        "target" => $row["target_type"],
    ], $rows);
}

$resource = $_GET["resource"] ?? "";
$id = $_GET["id"] ?? null;
$method = $_SERVER["REQUEST_METHOD"];
$input = body();

try {
    if ($method === "GET") {
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

        if ($resource === "analytics") {
            $users = fetch_users($pdo);
            $groups = fetch_groups($pdo);
            $posts = fetch_posts($pdo);
            $reports = fetch_reports($pdo);
            $inquiries = fetch_inquiries($pdo);
            respond([
                "summary" => [
                    "newUsers" => ["value" => count($users), "diff" => 0],
                    "newGroups" => ["value" => count($groups), "diff" => 0],
                    "activeUsers" => ["value" => count(array_filter($users, fn($u) => $u["status"] === "通常")), "diff" => 0],
                    "pendingInquiries" => count(array_filter($inquiries, fn($i) => $i["status"] === "未対応")),
                    "pendingReports" => count(array_filter($reports, fn($r) => $r["status"] === "未対応")),
                    "systemErrors" => 0,
                    "totalUsers" => count($users),
                ],
                "activeUserTrend" => ["labels" => ["7日前", "6日前", "5日前", "4日前", "3日前", "2日前", "今日"], "data" => [0, 0, 0, 0, 0, 0, count($users)]],
                "userAttributes" => [["label" => "登録済み", "value" => count($users)]],
                "usage" => ["newUsers7d" => count($users), "groupsCreated7d" => count($groups), "posts7d" => count($posts), "uploads7d" => 0],
                "featureRanking" => [
                    ["name" => "話し合い", "count" => count($posts)],
                    ["name" => "グループ", "count" => count($groups)],
                    ["name" => "お問い合わせ", "count" => count($inquiries)],
                ],
            ]);
        }

        if ($resource === "activities") {
            respond(fetch_logs($pdo));
        }

        if ($resource === "reports-counts") {
            $reports = fetch_reports($pdo);
            respond([
                "未対応" => count(array_filter($reports, fn($r) => $r["status"] === "未対応")),
                "確認中" => count(array_filter($reports, fn($r) => $r["status"] === "確認中")),
                "対応済み" => count(array_filter($reports, fn($r) => $r["status"] === "対応済み")),
            ]);
        }

        if ($resource === "inquiries-counts") {
            $inquiries = fetch_inquiries($pdo);
            respond([
                "未対応" => count(array_filter($inquiries, fn($i) => $i["status"] === "未対応")),
                "対応中" => count(array_filter($inquiries, fn($i) => $i["status"] === "対応中")),
                "対応済み" => count(array_filter($inquiries, fn($i) => $i["status"] === "対応済み")),
            ]);
        }

        if (!is_array($items)) {
            respond(["success" => false, "message" => "Unknown resource."], 404);
        }

        if ($id !== null) {
            $found = current(array_filter($items, fn($item) => (string) $item["id"] === (string) $id));
            respond($found ?: null);
        }

        $query = trim($_GET["query"] ?? "");
        $status = trim($_GET["status"] ?? "");
        $category = trim($_GET["category"] ?? "");
        if ($query !== "") {
            $items = array_values(array_filter($items, fn($item) => strpos(json_encode($item, JSON_UNESCAPED_UNICODE), $query) !== false));
        }
        if ($status !== "") {
            $items = array_values(array_filter($items, fn($item) => ($item["status"] ?? "") === $status));
        }
        if ($category !== "" && $category !== "すべて") {
            $items = array_values(array_filter($items, fn($item) => ($item["category"] ?? "") === $category));
        }
        respond(page_result($items, (int) ($_GET["page"] ?? 1), $resource === "logs" ? 10 : 20));
    }

    if ($method === "POST") {
        if ($resource === "notices") {
            $stmt = $pdo->prepare("INSERT INTO admin_notices (title, body, target_type, status, start_at, end_at, push_enabled, created_by, created_at, updated_at) VALUES (:title, :body, :target_type, 'published', :start_at, :end_at, :push_enabled, 1, NOW(), NOW())");
            $stmt->execute([
                "title" => $input["title"] ?? "",
                "body" => $input["body"] ?? "",
                "target_type" => $input["target"] ?? "全ユーザー",
                "start_at" => str_replace("/", "-", $input["startAt"] ?? null),
                "end_at" => str_replace("/", "-", $input["endAt"] ?? null),
                "push_enabled" => !empty($input["push"]) ? 1 : 0,
            ]);
            $_GET["resource"] = "notices";
            $_GET["id"] = "n" . $pdo->lastInsertId();
            respond(current(array_filter(fetch_notices($pdo), fn($n) => $n["id"] === $_GET["id"])));
        }

        if ($resource === "spots") {
            $stmt = $pdo->prepare("INSERT INTO admin_spots (name, category, prefecture, address, latitude, longitude, status, created_at, updated_at) VALUES (:name, :category, :prefecture, :address, :latitude, :longitude, :status, NOW(), NOW())");
            $stmt->execute([
                "name" => $input["name"] ?? "",
                "category" => $input["category"] ?? "",
                "prefecture" => $input["prefecture"] ?? "",
                "address" => $input["address"] ?? "",
                "latitude" => $input["lat"] ?? 0,
                "longitude" => $input["lng"] ?? 0,
                "status" => ($input["status"] ?? "公開中") === "非公開" ? "hidden" : "published",
            ]);
            respond(current(array_filter(fetch_spots($pdo), fn($s) => $s["id"] === "s" . $pdo->lastInsertId())));
        }

        if ($resource === "managers") {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, language_code, status, created_at, updated_at) VALUES (:name, :email, '', 'ja', 'active', NOW(), NOW())");
            $stmt->execute(["name" => $input["name"] ?? "", "email" => $input["email"] ?? ""]);
            $userId = (int) $pdo->lastInsertId();
            $level = ($input["role"] ?? "") === "管理者" ? 5 : 1;
            $pdo->prepare("INSERT INTO admin_users (user_id, admin_level, created_at) VALUES (:user_id, :admin_level, NOW())")->execute(["user_id" => $userId, "admin_level" => $level]);
            $adminUserId = (int) $pdo->lastInsertId();
            $pdo->commit();
            respond(current(array_filter(fetch_managers($pdo), fn($m) => $m["id"] === "m" . $adminUserId)));
        }
    }

    if ($method === "PATCH") {
        $action = $_GET["action"] ?? "";
        $numericId = (int) preg_replace("/^[a-z]+/", "", (string) $id);

        if ($resource === "users") {
            $status = $action === "delete" ? "deleted" : "suspended";
            $deletedAt = $action === "delete" ? "NOW()" : "NULL";
            $pdo->exec("UPDATE users SET status = " . $pdo->quote($status) . ", deleted_at = {$deletedAt}, updated_at = NOW() WHERE user_id = {$numericId}");
            respond(current(array_filter(fetch_users($pdo), fn($u) => $u["id"] === $numericId)));
        }

        if ($resource === "posts") {
            if ($action === "delete") {
                $pdo->exec("UPDATE messages SET admin_deleted_at = NOW() WHERE message_id = {$numericId}");
                respond(["ok" => true]);
            }
            $pdo->exec("UPDATE messages SET admin_visibility_status = IF(admin_visibility_status = 'hidden', 'visible', 'hidden') WHERE message_id = {$numericId}");
            respond(current(array_filter(fetch_posts($pdo), fn($p) => $p["id"] === "p" . $numericId)));
        }

        if ($resource === "reports") {
            $stmt = $pdo->prepare("UPDATE admin_reports SET status = :status, admin_note = :note, resolved_at = IF(:status = 'resolved', NOW(), resolved_at), updated_at = NOW() WHERE report_id = :id");
            $stmt->execute([
                "status" => to_status_code($input["status"] ?? "", ["未対応" => "open", "確認中" => "reviewing", "対応済み" => "resolved"], "open"),
                "note" => $input["note"] ?? "",
                "id" => $numericId,
            ]);
            respond(current(array_filter(fetch_reports($pdo), fn($r) => $r["id"] === "r" . $numericId)));
        }

        if ($resource === "inquiries") {
            $stmt = $pdo->prepare("UPDATE admin_inquiries SET status = :status, admin_memo = :memo, updated_at = NOW() WHERE public_id = :id");
            $stmt->execute([
                "status" => to_status_code($input["status"] ?? "", ["未対応" => "open", "対応中" => "working", "対応済み" => "resolved"], "open"),
                "memo" => $input["memo"] ?? "",
                "id" => $id,
            ]);
            respond(current(array_filter(fetch_inquiries($pdo), fn($i) => $i["id"] === $id)));
        }

        if ($resource === "notices") {
            $stmt = $pdo->prepare("UPDATE admin_notices SET title = :title, body = :body, target_type = :target_type, start_at = :start_at, end_at = :end_at, push_enabled = :push_enabled, updated_at = NOW() WHERE notice_id = :id");
            $stmt->execute([
                "title" => $input["title"] ?? "",
                "body" => $input["body"] ?? "",
                "target_type" => $input["target"] ?? "全ユーザー",
                "start_at" => str_replace("/", "-", $input["startAt"] ?? null),
                "end_at" => str_replace("/", "-", $input["endAt"] ?? null),
                "push_enabled" => !empty($input["push"]) ? 1 : 0,
                "id" => $numericId,
            ]);
            respond(current(array_filter(fetch_notices($pdo), fn($n) => $n["id"] === "n" . $numericId)));
        }

        if ($resource === "spots") {
            $stmt = $pdo->prepare("UPDATE admin_spots SET name = :name, category = :category, prefecture = :prefecture, address = :address, latitude = :latitude, longitude = :longitude, status = :status, updated_at = NOW() WHERE spot_id = :id");
            $stmt->execute([
                "name" => $input["name"] ?? "",
                "category" => $input["category"] ?? "",
                "prefecture" => $input["prefecture"] ?? "",
                "address" => $input["address"] ?? "",
                "latitude" => $input["lat"] ?? 0,
                "longitude" => $input["lng"] ?? 0,
                "status" => ($input["status"] ?? "公開中") === "非公開" ? "hidden" : "published",
                "id" => $numericId,
            ]);
            respond(current(array_filter(fetch_spots($pdo), fn($s) => $s["id"] === "s" . $numericId)));
        }

        if ($resource === "managers") {
            $manager = current(array_filter(fetch_managers($pdo), fn($m) => $m["id"] === "m" . $numericId));
            if (!$manager) {
                respond(null, 404);
            }
            $next = $manager["status"] === "停止中" ? "active" : "suspended";
            $stmt = $pdo->prepare("UPDATE users u INNER JOIN admin_users au ON au.user_id = u.user_id SET u.status = :status, u.updated_at = NOW() WHERE au.admin_user_id = :id");
            $stmt->execute(["status" => $next, "id" => $numericId]);
            respond(current(array_filter(fetch_managers($pdo), fn($m) => $m["id"] === "m" . $numericId)));
        }
    }

    if ($method === "DELETE") {
        $numericId = (int) preg_replace("/^[a-z]+/", "", (string) $id);
        if ($resource === "notices") {
            $pdo->exec("UPDATE admin_notices SET deleted_at = NOW() WHERE notice_id = {$numericId}");
            respond(true);
        }
        if ($resource === "spots") {
            $pdo->exec("UPDATE admin_spots SET deleted_at = NOW() WHERE spot_id = {$numericId}");
            respond(true);
        }
    }

    if ($method === "POST" && $resource === "inquiry-replies") {
        $message = trim($input["message"] ?? "");
        if ($message === "") {
            respond(["success" => false, "message" => "返信内容を入力してください。"], 400);
        }

        $inquiryStmt = $pdo->prepare("
            SELECT i.*, u.name AS user_name, u.email
            FROM admin_inquiries i
            LEFT JOIN users u ON u.user_id = i.user_id
            WHERE i.public_id = :public_id
            LIMIT 1
        ");
        $inquiryStmt->execute(["public_id" => $id]);
        $inquiry = $inquiryStmt->fetch();

        if (!$inquiry) {
            respond(["success" => false, "message" => "お問い合わせが見つかりません。"], 404);
        }
        if (empty($inquiry["email"])) {
            respond(["success" => false, "message" => "返信先メールアドレスがありません。"], 400);
        }

        $gasResponse = send_inquiry_reply_via_gas($inquiry, $message);
        $nextStatus = to_status_code($input["status"] ?? "", ["未対応" => "open", "対応中" => "working", "対応済み" => "resolved"], "working");

        $stmt = $pdo->prepare("
            INSERT INTO admin_inquiry_replies
              (inquiry_id, manager_user_id, body, delivery_status, gas_response, created_at)
            VALUES
              (:inquiry_id, 1, :body, 'sent', :gas_response, NOW())
        ");
        $stmt->execute([
            "inquiry_id" => $inquiry["inquiry_id"],
            "body" => $message,
            "gas_response" => $gasResponse["body"],
        ]);

        $updateStmt = $pdo->prepare("
            UPDATE admin_inquiries
            SET status = :status, admin_memo = :memo, updated_at = NOW()
            WHERE public_id = :public_id
        ");
        $updateStmt->execute([
            "status" => $nextStatus,
            "memo" => $input["memo"] ?? $inquiry["admin_memo"],
            "public_id" => $id,
        ]);

        respond(["ok" => true, "inquiryId" => $id, "message" => $message]);
    }

    respond(["success" => false, "message" => "Unsupported method."], 405);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "Admin API error.", "error" => $e->getMessage()], 500);
}
