<?php

// 管理画面で使う共通 API の入口です。
// この 1 ファイルで、一覧取得・詳細取得・作成・更新・削除・外部送信をまとめて扱います。

require_once __DIR__ . "/../config/db.php";

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
// 未設定なら "-" を返し、表示崩れを防ぎます。
function format_dt(?string $value): string
{
    if (!$value) {
        return "-";
    }
    return str_replace("-", "/", substr($value, 0, 16));
}

function is_cottage_manager_user(array $item): bool
{
    return strpos($item["name"] ?? "", "コテージ") !== false
        || strpos($item["email"] ?? "", "cottage.manager") !== false
        || strpos($item["bio"] ?? "", "コテージ") !== false;
}

function admin_user_time(array $item, string $key): int
{
    $value = $item[$key] ?? "";
    if ($value === "" || $value === "-") {
        return 0;
    }
    return strtotime(str_replace("/", "-", $value)) ?: 0;
}

function sort_admin_users(array $items, string $sort): array
{
    if ($sort === "cottageManager") {
        $items = array_values(array_filter($items, fn($item) => is_cottage_manager_user($item)));
    } elseif ($sort === "nonCottageManager") {
        $items = array_values(array_filter($items, fn($item) => !is_cottage_manager_user($item)));
    }

    usort($items, function ($a, $b) use ($sort) {
        if ($sort === "lastLoginAt") {
            return admin_user_time($b, "lastLoginAt") <=> admin_user_time($a, "lastLoginAt");
        }
        if ($sort === "cottageManager" || $sort === "nonCottageManager") {
            return ($a["id"] ?? 0) <=> ($b["id"] ?? 0);
        }
        return admin_user_time($b, "registeredAt") <=> admin_user_time($a, "registeredAt");
    });

    return $items;
}

// users.status を管理画面で見やすい日本語ラベルに変換します。
function user_status_label(?string $status): string
{
    return [
        "suspended" => "停止中",
        "deleted" => "退会済み",
    ][$status] ?? "通常";
}

// お知らせの状態コードを日本語表示に変換します。
function notice_status_label(?string $status): string
{
    return [
        "ended" => "終了",
        "draft" => "下書き",
    ][$status] ?? "公開中";
}

// 通報の状態コードを日本語表示に変換します。
function report_status_label(?string $status): string
{
    return [
        "reviewing" => "確認中",
        "resolved" => "対応済み",
    ][$status] ?? "未対応";
}

// お問い合わせの状態コードを日本語表示に変換します。
function inquiry_status_label(?string $status): string
{
    return [
        "working" => "対応中",
        "resolved" => "対応済み",
    ][$status] ?? "未対応";
}

// 表示ラベルを DB 保存用のコードに戻すための変換関数です。
function to_status_code(string $label, array $map, string $default): string
{
    return $map[$label] ?? $default;
}

// config/db.php で読み込んだ設定や環境変数を参照しやすくするためのラッパーです。
// 設定配列 → 環境変数 → デフォルト値の順で値を決めます。
function app_config(string $key, $default = null)
{
    global $config;
    if (!empty($config[$key])) {
        return $config[$key];
    }
    $envValue = getenv($key);
    return $envValue !== false && $envValue !== "" ? $envValue : $default;
}

// Google Apps Script に JSON を POST するための共通関数です。
// cURL が使える環境では cURL を優先し、使えない場合は file_get_contents に切り替えます。
function sendRealtimeEvent(string $room, string $event, array $data = []): bool
{
    $url = app_config("REALTIME_EMIT_URL", "https://ws.tabital.com/emit");
    $secret = app_config("REALTIME_SECRET", "");

    if (!$secret) {
        error_log("Realtime event skipped: REALTIME_SECRET is not set.");
        return false;
    }

    $json = json_encode([
        "room" => $room,
        "event" => $event,
        "data" => $data,
    ], JSON_UNESCAPED_UNICODE);

    if ($json === false) {
        error_log("Realtime event failed: payload JSON encode error.");
        return false;
    }

    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "Content-Type: application/json",
                "Authorization: Bearer " . $secret,
            ],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 2,
        ]);

        $body = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false || $status < 200 || $status >= 300) {
            error_log("Realtime event failed: HTTP {$status} {$error}");
            return false;
        }

        return true;
    }

    $context = stream_context_create([
        "http" => [
            "method" => "POST",
            "header" => "Content-Type: application/json\r\nAuthorization: Bearer {$secret}\r\n",
            "content" => $json,
            "timeout" => 3,
            "ignore_errors" => true,
        ],
    ]);

    $body = file_get_contents($url, false, $context);
    $status = 0;
    if (isset($http_response_header[0]) && preg_match("/\s(\d{3})\s/", $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    if ($body === false || $status < 200 || $status >= 300) {
        error_log("Realtime event failed: HTTP {$status}");
        return false;
    }

    return true;
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

// お問い合わせ返信を GAS 経由で送るための専用処理です。
// PHP 側では送信に必要な情報をまとめ、メール送信の実処理は GAS に任せます。
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

// ユーザー一覧を取得します。
// プロフィール、最終ログイン、所属グループ数、投稿数など、管理画面で見たい情報も合わせて返します。
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

// グループ一覧を取得します。
// メンバー数や旅行期間、旅程数、アルバム数などを集計して返します。
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

// 投稿一覧を取得します。
// 投稿本文だけでなく、投稿者・所属グループ・通報件数も合わせて返します。
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

// 通報一覧を取得します。
// 対象ユーザー、通報者、通報理由、管理メモなど、処理に必要な情報をひとまとめにします。
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

// お問い合わせ一覧を取得します。
// 返信に必要なユーザー名やメールアドレスも一緒に返します。
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

// お知らせ一覧を取得します。
// 削除済みを除外して、公開状態や配信期間が分かる形に整えます。
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

// 観光スポット一覧を取得します。
// 緯度経度や公開状態を含めて返し、管理画面でそのまま使える形にします。
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

// 管理者一覧を取得します。
// 権限レベルを役割名に変換し、最終ログイン日時も付けて返します。
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

// 管理操作ログを取得します。
// 誰が何をしたかを時系列で追えるようにする監査用データです。
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

function activity_type(?string $targetType): string
{
    return [
        "ユーザー" => "user",
        "user" => "user",
        "グループ" => "group",
        "旅行グループ" => "group",
        "group" => "group",
        "お問い合わせ" => "inquiry",
        "inquiry" => "inquiry",
        "通報" => "report",
        "report" => "report",
        "お知らせ" => "notice",
        "notice" => "notice",
        "投稿" => "post",
        "post" => "post",
        "スポット" => "spot",
        "spot" => "spot",
    ][$targetType] ?? "admin";
}

function activity_time(?string $value): string
{
    if (!$value) {
        return "-";
    }

    $timestamp = strtotime($value);
    if (!$timestamp) {
        return "-";
    }

    return date("n/j H:i", $timestamp);
}

function fetch_recent_activities(PDO $pdo): array
{
    $activities = [];

    $logRows = $pdo->query("
        SELECT l.activity_log_id, l.action_text, l.target_type, l.created_at, u.name AS manager_name
        FROM admin_activity_logs l
        LEFT JOIN users u ON u.user_id = l.manager_user_id
        ORDER BY l.created_at DESC, l.activity_log_id DESC
        LIMIT 10
    ")->fetchAll();
    foreach ($logRows as $row) {
        $activities[] = [
            "id" => "log-" . $row["activity_log_id"],
            "text" => ($row["manager_name"] ?: "管理者") . "が" . $row["action_text"],
            "time" => activity_time($row["created_at"]),
            "type" => activity_type($row["target_type"]),
            "sortAt" => $row["created_at"],
        ];
    }

    $inquiryRows = $pdo->query("
        SELECT inquiry_id, title, created_at
        FROM admin_inquiries
        ORDER BY created_at DESC, inquiry_id DESC
        LIMIT 10
    ")->fetchAll();
    foreach ($inquiryRows as $row) {
        $activities[] = [
            "id" => "inquiry-" . $row["inquiry_id"],
            "text" => "お問い合わせ「" . $row["title"] . "」が届きました",
            "time" => activity_time($row["created_at"]),
            "type" => "inquiry",
            "sortAt" => $row["created_at"],
        ];
    }

    $reportRows = $pdo->query("
        SELECT report_id, reason, reported_at
        FROM admin_reports
        ORDER BY reported_at DESC, report_id DESC
        LIMIT 10
    ")->fetchAll();
    foreach ($reportRows as $row) {
        $activities[] = [
            "id" => "report-" . $row["report_id"],
            "text" => "通報「" . $row["reason"] . "」が届きました",
            "time" => activity_time($row["reported_at"]),
            "type" => "report",
            "sortAt" => $row["reported_at"],
        ];
    }

    $userRows = $pdo->query("
        SELECT user_id, name, created_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC, user_id DESC
        LIMIT 10
    ")->fetchAll();
    foreach ($userRows as $row) {
        $activities[] = [
            "id" => "user-" . $row["user_id"],
            "text" => $row["name"] . "さんが登録しました",
            "time" => activity_time($row["created_at"]),
            "type" => "user",
            "sortAt" => $row["created_at"],
        ];
    }

    $groupRows = $pdo->query("
        SELECT group_id, group_name, created_at
        FROM user_groups
        ORDER BY created_at DESC, group_id DESC
        LIMIT 10
    ")->fetchAll();
    foreach ($groupRows as $row) {
        $activities[] = [
            "id" => "group-" . $row["group_id"],
            "text" => "旅行グループ「" . $row["group_name"] . "」が作成されました",
            "time" => activity_time($row["created_at"]),
            "type" => "group",
            "sortAt" => $row["created_at"],
        ];
    }

    $noticeRows = $pdo->query("
        SELECT notice_id, title, created_at
        FROM admin_notices
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC, notice_id DESC
        LIMIT 10
    ")->fetchAll();
    foreach ($noticeRows as $row) {
        $activities[] = [
            "id" => "notice-" . $row["notice_id"],
            "text" => "お知らせ「" . $row["title"] . "」を公開しました",
            "time" => activity_time($row["created_at"]),
            "type" => "notice",
            "sortAt" => $row["created_at"],
        ];
    }

    usort($activities, fn($a, $b) => strcmp($b["sortAt"], $a["sortAt"]));
    $activities = array_slice($activities, 0, 8);

    return array_map(function ($activity) {
        unset($activity["sortAt"]);
        return $activity;
    }, $activities);
}

// URL のクエリ文字列から、どの資源を扱うかと単体指定の ID を受け取ります。
// 今日TABIを使ったアクティブユーザー数を取得します。
function fetch_today_active_users(PDO $pdo): int
{
    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT uda.user_id) AS active_users
        FROM user_daily_activities uda
        INNER JOIN users u ON u.user_id = uda.user_id
        WHERE uda.activity_date = CURDATE()
          AND u.status = 'active'
          AND u.deleted_at IS NULL
    ");

    return (int) $stmt->fetchColumn();
}

// 過去7日間の日別アクティブユーザー数を取得します。
function fetch_active_user_trend(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            uda.activity_date,
            COUNT(DISTINCT uda.user_id) AS active_users
        FROM user_daily_activities uda
        INNER JOIN users u ON u.user_id = uda.user_id
        WHERE uda.activity_date >= CURDATE() - INTERVAL 6 DAY
          AND uda.activity_date <= CURDATE()
          AND u.status = 'active'
          AND u.deleted_at IS NULL
        GROUP BY uda.activity_date
        ORDER BY uda.activity_date
    ");

    $rows = $stmt->fetchAll();

    $countsByDate = [];
    foreach ($rows as $row) {
        $countsByDate[$row["activity_date"]] = (int) $row["active_users"];
    }

    $labels = [];
    $data = [];

    for ($i = 6; $i >= 0; $i--) {
        $date = date("Y-m-d", strtotime("-{$i} days"));

        $labels[] = $i === 0 ? "今日" : "{$i}日前";
        $data[] = $countsByDate[$date] ?? 0;
    }

    return [
        "labels" => $labels,
        "data" => $data,
    ];
}

// PWAプッシュ通知の許可状況を、push_token の有無で集計します。
function fetch_notification_permissions(PDO $pdo): array
{
    $row = $pdo->query("
        SELECT
            COUNT(DISTINCT u.user_id) AS total_users,
            COUNT(DISTINCT CASE
                WHEN d.push_token IS NOT NULL AND TRIM(d.push_token) <> '' THEN u.user_id
            END) AS enabled_users
        FROM users u
        LEFT JOIN user_devices d ON d.user_id = u.user_id
        WHERE u.deleted_at IS NULL
          AND COALESCE(u.status, 'active') <> 'deleted'
    ")->fetch();

    $totalUsers = (int) ($row["total_users"] ?? 0);
    $enabledUsers = (int) ($row["enabled_users"] ?? 0);
    $disabledUsers = max(0, $totalUsers - $enabledUsers);

    return [
        ["label" => "許可済み", "value" => $enabledUsers],
        ["label" => "未許可", "value" => $disabledUsers],
    ];
}

// URL のクエリ文字列から、どの資源を扱うかと単体指定の ID を受け取ります。
$resource = $_GET["resource"] ?? "";
$id = $_GET["id"] ?? null;
$method = $_SERVER["REQUEST_METHOD"];
$input = body();

try {
    // GET は一覧取得、単体取得、集計取得に使います。
    if ($method === "GET") {
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

        // 一覧データに対して、検索・状態絞り込み・カテゴリ絞り込みを順番に適用します。
        $query = trim($_GET["query"] ?? "");
        $status = trim($_GET["status"] ?? "");
        $category = trim($_GET["category"] ?? "");
        $prefecture = trim($_GET["prefecture"] ?? "");
        if ($query !== "") {
            $items = array_values(array_filter($items, fn($item) => strpos(json_encode($item, JSON_UNESCAPED_UNICODE), $query) !== false));
        }
        if ($status !== "") {
            $items = array_values(array_filter($items, fn($item) => ($item["status"] ?? "") === $status));
        }
        if ($category !== "" && $category !== "すべて") {
            $items = array_values(array_filter($items, fn($item) => ($item["category"] ?? "") === $category));
        }
        if ($prefecture !== "" && $prefecture !== "すべて") {
            $items = array_values(array_filter($items, fn($item) => ($item["prefecture"] ?? "") === $prefecture));
        }
        if ($resource === "users") {
            $items = sort_admin_users($items, trim($_GET["sort"] ?? ""));
        }

        $perPage = $resource === "users" || $resource === "logs" ? 10 : 20;
        respond(page_result($items, (int) ($_GET["page"] ?? 1), $perPage));
    }

    if ($method === "POST") {
        // POST は新規作成や外部送信のような、データを増やす処理に使います。
        if ($resource === "notices") {
            // お知らせを新規登録します。
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
            // 観光スポットを新規登録します。
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
            // 管理者ユーザーを新規作成します。
            // users と admin_users の 2 テーブルに分けて登録するので、トランザクションでまとめます。
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
        // PATCH は既存データの状態変更に使います。
        $action = $_GET["action"] ?? "";
        $numericId = (int) preg_replace("/^[a-z]+/", "", (string) $id);

        // action で削除・停止・公開切り替えのような細かい振る舞いを分けます。
        if ($resource === "users") {
            $status = $action === "delete" ? "deleted" : "suspended";
            $deletedAt = $action === "delete" ? "NOW()" : "NULL";
            $pdo->exec("UPDATE users SET status = " . $pdo->quote($status) . ", deleted_at = {$deletedAt}, updated_at = NOW() WHERE user_id = {$numericId}");
            respond(current(array_filter(fetch_users($pdo), fn($u) => $u["id"] === $numericId)));
        }

        if ($resource === "posts") {
            // 投稿の非表示切り替え、または管理画面上の削除を行います。
            if ($action === "delete") {
                $pdo->exec("UPDATE messages SET admin_deleted_at = NOW() WHERE message_id = {$numericId}");
                respond(["ok" => true]);
            }
            $pdo->exec("UPDATE messages SET admin_visibility_status = IF(admin_visibility_status = 'hidden', 'visible', 'hidden') WHERE message_id = {$numericId}");
            respond(current(array_filter(fetch_posts($pdo), fn($p) => $p["id"] === "p" . $numericId)));
        }

        if ($resource === "reports") {
            // 通報の状態と管理メモを更新します。
            $stmt = $pdo->prepare("UPDATE admin_reports SET status = :status, admin_note = :note, resolved_at = IF(:status = 'resolved', NOW(), resolved_at), updated_at = NOW() WHERE report_id = :id");
            $stmt->execute([
                "status" => to_status_code($input["status"] ?? "", ["未対応" => "open", "確認中" => "reviewing", "対応済み" => "resolved"], "open"),
                "note" => $input["note"] ?? "",
                "id" => $numericId,
            ]);
            respond(current(array_filter(fetch_reports($pdo), fn($r) => $r["id"] === "r" . $numericId)));
        }

        if ($resource === "inquiries") {
            // お問い合わせの状態と管理メモを更新します。
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
        // DELETE は論理削除のような「見えなくする」処理に使っています。
        $numericId = (int) preg_replace("/^[a-z]+/", "", (string) $id);
        if ($resource === "notices") {
            // お知らせは削除フラグを立てる方式です。
            $pdo->exec("UPDATE admin_notices SET deleted_at = NOW() WHERE notice_id = {$numericId}");
            respond(true);
        }
        if ($resource === "spots") {
            // スポットも同じく論理削除です。
            $pdo->exec("UPDATE admin_spots SET deleted_at = NOW() WHERE spot_id = {$numericId}");
            respond(true);
        }
    }

    if ($method === "POST" && $resource === "inquiry-replies") {
        // お問い合わせ返信は、DB 更新だけでなく GAS 送信も伴う特別な処理です。
        $message = trim($input["message"] ?? "");
        if ($message === "") {
            respond(["success" => false, "message" => "返信内容を入力してください。"], 400);
        }

        // 返信対象のお問い合わせを取得し、送信に必要な情報を揃えます。
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

                // GAS にメール送信を依頼し、送信結果を受け取ります。
        $gasResponse = send_inquiry_reply_via_gas($inquiry, $message);
        $nextStatus = to_status_code($input["status"] ?? "", ["未対応" => "open", "対応中" => "working", "対応済み" => "resolved"], "working");

                // 送信履歴を replies テーブルに保存します。
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
    // 途中で例外が起きたら、トランザクション中なら必ず巻き戻して整合性を保ちます。
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // 失敗内容を JSON で返し、フロント側からも原因を確認できるようにします。
    respond(["success" => false, "message" => "Admin API error.", "error" => $e->getMessage()], 500);
}
