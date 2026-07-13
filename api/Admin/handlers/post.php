<?php

function handle_admin_post(PDO $pdo, string $resource, $id, array $input): void
{
    if ($resource === "inquiry-replies") {
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
            // フォーム上で選ばれた表示状態を、DB 保存用のステータスコードに変換します。
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

        sendRealtimeEvent("admin:global", "inquiry_updated", [
            "id" => (int) $inquiry["inquiry_id"],
            "public_id" => $id,
        ]);

            // 画面側に返信完了を返し、対象問い合わせの ID と本文を返却します。
        respond(["ok" => true, "inquiryId" => $id, "message" => $message]);
        return;
    }

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
        $noticeId = (int) $pdo->lastInsertId();
        sendRealtimeEvent("admin:global", "notice_created", [
            "notice_id" => $noticeId,
        ]);
        $_GET["resource"] = "notices";
        $_GET["id"] = "n" . $noticeId;
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
        $spotId = (int) $pdo->lastInsertId();
        sendRealtimeEvent("admin:global", "spot_created", [
            "spot_id" => $spotId,
        ]);
        respond(current(array_filter(fetch_spots($pdo), fn($s) => $s["id"] === "s" . $spotId)));
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
        sendRealtimeEvent("admin:global", "manager_created", [
            "manager_id" => $adminUserId,
            "user_id" => $userId,
        ]);
        sendRealtimeEvent("admin:global", "user_created", [
            "user_id" => $userId,
        ]);
        respond(current(array_filter(fetch_managers($pdo), fn($m) => $m["id"] === "m" . $adminUserId)));
    }
}
