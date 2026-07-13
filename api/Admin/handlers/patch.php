<?php

function handle_admin_patch(PDO $pdo, string $resource, $id, array $input): void
{
    // PATCH は既存データの状態変更に使います。
    // resource ごとに、停止・非表示・公開切り替えなどの更新内容を分けます。
    $action = $_GET["action"] ?? "";
    $numericId = (int) preg_replace("/^[a-z]+/", "", (string) $id);

    // action で削除・停止・公開切り替えのような細かい振る舞いを分けます。
    if ($resource === "users") {
        $status = $action === "delete" ? "deleted" : "suspended";
        $deletedAt = $action === "delete" ? "NOW()" : "NULL";
        $pdo->exec("UPDATE users SET status = " . $pdo->quote($status) . ", deleted_at = {$deletedAt}, updated_at = NOW() WHERE user_id = {$numericId}");
        sendRealtimeEvent("admin:global", $action === "delete" ? "user_deleted" : "user_updated", [
            "user_id" => $numericId,
        ]);
        respond(current(array_filter(fetch_users($pdo), fn($u) => $u["id"] === $numericId)));
    }

    if ($resource === "posts") {
        // 投稿の非表示切り替え、または管理画面上の削除を行います。
        if ($action === "delete") {
            $pdo->exec("UPDATE messages SET admin_deleted_at = NOW() WHERE message_id = {$numericId}");
            sendRealtimeEvent("admin:global", "post_deleted", [
                "post_id" => $numericId,
            ]);
            respond(["ok" => true]);
        }
        $pdo->exec("UPDATE messages SET admin_visibility_status = IF(admin_visibility_status = 'hidden', 'visible', 'hidden') WHERE message_id = {$numericId}");
        sendRealtimeEvent("admin:global", "post_updated", [
            "post_id" => $numericId,
        ]);
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
        sendRealtimeEvent("admin:global", "report_updated", [
            "report_id" => $numericId,
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
        sendRealtimeEvent("admin:global", "inquiry_updated", [
            "public_id" => $id,
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
        sendRealtimeEvent("admin:global", "notice_updated", [
            "notice_id" => $numericId,
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
        sendRealtimeEvent("admin:global", "spot_updated", [
            "spot_id" => $numericId,
        ]);
        respond(current(array_filter(fetch_spots($pdo), fn($s) => $s["id"] === "s" . $numericId)));
    }

    if ($resource === "managers") {
        // 管理者の現状を読み出して、停止中なら有効化、通常なら停止に切り替えます。
        $manager = current(array_filter(fetch_managers($pdo), fn($m) => $m["id"] === "m" . $numericId));
        if (!$manager) {
            respond(null, 404);
        }
        $next = $manager["status"] === "停止中" ? "active" : "suspended";
        $stmt = $pdo->prepare("UPDATE users u INNER JOIN admin_users au ON au.user_id = u.user_id SET u.status = :status, u.updated_at = NOW() WHERE au.admin_user_id = :id");
        $stmt->execute(["status" => $next, "id" => $numericId]);
        sendRealtimeEvent("admin:global", "manager_updated", [
            "manager_id" => $numericId,
        ]);
        respond(current(array_filter(fetch_managers($pdo), fn($m) => $m["id"] === "m" . $numericId)));
    }
}
