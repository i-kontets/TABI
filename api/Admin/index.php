<?php
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
        SELECT i.*, u.name AS user_name
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
        $stmt = $pdo->prepare("INSERT INTO admin_inquiry_replies (inquiry_id, manager_user_id, body, created_at) SELECT inquiry_id, 1, :body, NOW() FROM admin_inquiries WHERE public_id = :public_id");
        $stmt->execute(["body" => $input["message"] ?? "", "public_id" => $id]);
        $pdo->prepare("UPDATE admin_inquiries SET status = 'working', updated_at = NOW() WHERE public_id = :public_id")->execute(["public_id" => $id]);
        respond(["ok" => true, "inquiryId" => $id, "message" => $input["message"] ?? ""]);
    }

    respond(["success" => false, "message" => "Unsupported method."], 405);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(["success" => false, "message" => "Admin API error.", "error" => $e->getMessage()], 500);
}
