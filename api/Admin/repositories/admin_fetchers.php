<?php

// users 一覧は、プロフィールや利用状況の補助情報をまとめて管理画面向けに整形します。
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

// activity_type は、ログやタイムライン上で使う種別キーへ変換します。
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

// activity_time は、履歴表示用に mm/dd HH:ii 相当の短い表記へ丸めます。
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

// 最近の管理アクティビティを、種類ごとに集めて 1 つのタイムラインにまとめます。
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

// 今日のアクティブユーザー数を取得します。
function fetch_pending_support_items(PDO $pdo): array
{
    $items = [];

    $inquiryRows = $pdo->query("
        SELECT inquiry_id, public_id, title, created_at
        FROM admin_inquiries
        WHERE status IS NULL OR status NOT IN ('working', 'resolved')
        ORDER BY created_at DESC, inquiry_id DESC
    ")->fetchAll();

    foreach ($inquiryRows as $row) {
        $items[] = [
            "id" => "inquiry-" . $row["inquiry_id"],
            "type" => "inquiry",
            "title" => $row["title"],
            "status" => "未対応",
            "createdAt" => format_dt($row["created_at"]),
            "sortAt" => $row["created_at"],
            "to" => "/admin/inquiries/" . $row["public_id"],
        ];
    }

    $reportRows = $pdo->query("
        SELECT report_id, report_type, reason, reported_at
        FROM admin_reports
        WHERE status IS NULL OR status NOT IN ('reviewing', 'resolved')
        ORDER BY reported_at DESC, report_id DESC
    ")->fetchAll();

    foreach ($reportRows as $row) {
        $title = trim((string) ($row["report_type"] ?: $row["reason"] ?: "通報"));
        $items[] = [
            "id" => "report-" . $row["report_id"],
            "type" => "report",
            "title" => $title,
            "status" => "未対応",
            "createdAt" => format_dt($row["reported_at"]),
            "sortAt" => $row["reported_at"],
            "to" => "/admin/reports/r" . $row["report_id"],
        ];
    }

    usort($items, fn($a, $b) => strcmp($b["sortAt"], $a["sortAt"]));

    return array_map(function ($item) {
        unset($item["sortAt"]);
        return $item;
    }, $items);
}

function admin_column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table_name
          AND COLUMN_NAME = :column_name
    ");
    $stmt->execute([
        "table_name" => $table,
        "column_name" => $column,
    ]);

    return (int) $stmt->fetchColumn() > 0;
}

function tokyo_day_range(int $offsetDays = 0): array
{
    $timezone = new DateTimeZone("Asia/Tokyo");
    $start = (new DateTimeImmutable("today", $timezone))->modify("{$offsetDays} days");
    $end = $start->modify("+1 day");

    return [
        $start->format("Y-m-d H:i:s"),
        $end->format("Y-m-d H:i:s"),
    ];
}

function fetch_system_error_summary(PDO $pdo): array
{
    if (!admin_column_exists($pdo, "system_errors", "error_id")) {
        return ["value" => 0, "today" => 0];
    }

    [$start, $end] = tokyo_day_range();
    $countExpr = admin_column_exists($pdo, "system_errors", "occurrence_count")
        ? "COALESCE(occurrence_count, 1)"
        : "1";
    $occurredAtExpr = admin_column_exists($pdo, "system_errors", "last_occurred_at")
        ? "COALESCE(last_occurred_at, created_at)"
        : "created_at";

    $stmt = $pdo->prepare("
        SELECT
            SUM({$countExpr}) AS unresolved_count,
            SUM(CASE WHEN {$occurredAtExpr} >= :start_at AND {$occurredAtExpr} < :end_at THEN {$countExpr} ELSE 0 END) AS today_count
        FROM system_errors
        WHERE status = 'unresolved'
    ");
    $stmt->execute([
        "start_at" => $start,
        "end_at" => $end,
    ]);
    $row = $stmt->fetch() ?: [];

    return [
        "value" => (int) ($row["unresolved_count"] ?? 0),
        "today" => (int) ($row["today_count"] ?? 0),
    ];
}

function fetch_today_active_users(PDO $pdo): int
{
    if (!admin_column_exists($pdo, "users", "last_active_at")) {
        return 0;
    }

    [$start, $end] = tokyo_day_range();
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS active_users
        FROM users
        WHERE last_active_at >= :start_at
          AND last_active_at < :end_at
          AND status = 'active'
          AND deleted_at IS NULL
    ");
    $stmt->execute([
        "start_at" => $start,
        "end_at" => $end,
    ]);

    return (int) $stmt->fetchColumn();
}

// 過去7日間の日別アクティブユーザー数を取得します。
function fetch_active_user_trend(PDO $pdo): array
{
    $labels = [];
    $data = [];
    $hasLastActiveAt = admin_column_exists($pdo, "users", "last_active_at");
    $stmt = $hasLastActiveAt ? $pdo->prepare("
        SELECT COUNT(*) AS active_users
        FROM users
        WHERE last_active_at >= :start_at
          AND last_active_at < :end_at
          AND status = 'active'
          AND deleted_at IS NULL
    ") : null;

    for ($i = 6; $i >= 0; $i--) {
        [$start, $end] = tokyo_day_range(-$i);
        $labels[] = $i === 0 ? "今日" : "{$i}日前";

        if (!$stmt) {
            $data[] = 0;
            continue;
        }

        $stmt->execute([
            "start_at" => $start,
            "end_at" => $end,
        ]);
        $data[] = (int) $stmt->fetchColumn();
    }

    return [
        "labels" => $labels,
        "data" => $data,
    ];

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

