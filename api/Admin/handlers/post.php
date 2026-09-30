<?php

/**
 * 管理 API の GET/POST/PATCH/DELETE ごとの処理を担当します。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * handle_admin_post は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function handle_admin_post(PDO $pdo, string $resource, $id, array $input): void
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($resource === "inquiry-replies") {
        // お問い合わせ返信は、DB 更新だけでなく GAS 送信も伴う特別な処理です。
        $message = trim($input["message"] ?? "");
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($message === "") {
            // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
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
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $inquiryStmt->execute(["public_id" => $id]);
        $inquiry = $inquiryStmt->fetch();

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!$inquiry) {
            // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
            respond(["success" => false, "message" => "お問い合わせが見つかりません。"], 404);
        }
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (empty($inquiry["email"])) {
            // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
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
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute([
            "inquiry_id" => $inquiry["inquiry_id"],
            "body" => $message,
            "gas_response" => $gasResponse["body"],
        ]);

        // SQL を準備し、あとから値を安全に入れられる形にします。
        $updateStmt = $pdo->prepare("
            UPDATE admin_inquiries
            SET status = :status, admin_memo = :memo, updated_at = NOW()
            WHERE public_id = :public_id
        ");
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $updateStmt->execute([
            "status" => $nextStatus,
            "memo" => $input["memo"] ?? $inquiry["admin_memo"],
            "public_id" => $id,
        ]);

        // WebSocket通知を送ります。DB更新後に呼ぶことで、他の画面へ「変更があった」ことを伝えます。
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
        // 作成者はセッションから決定し、commit後にだけWebSocket配信を依頼します。
        $noticeId = noticeCreate($pdo, $input, (int) $_SESSION['user_id']);
        noticePublishRealtime($pdo, $noticeId);
        sendRealtimeEvent("admin:global", "notice_created", [
            "notice_id" => $noticeId,
        ]);
        $_GET["resource"] = "notices";
        $_GET["id"] = "n" . $noticeId;
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(current(array_filter(fetch_notices($pdo), fn($n) => $n["id"] === $_GET["id"])));
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($resource === "spots") {
        // 観光スポットを新規登録します。
        $stmt = $pdo->prepare("INSERT INTO admin_spots (name, category, prefecture, address, latitude, longitude, status, created_at, updated_at) VALUES (:name, :category, :prefecture, :address, :latitude, :longitude, :status, NOW(), NOW())");
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
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
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(current(array_filter(fetch_spots($pdo), fn($s) => $s["id"] === "s" . $spotId)));
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($resource === "managers") {
        // 管理者ユーザーを新規作成します。
        // users と admin_users の 2 テーブルに分けて登録するので、トランザクションでまとめます。
        $pdo->beginTransaction();
        // SQL を準備し、あとから値を安全に入れられる形にします。
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, language_code, status, created_at, updated_at) VALUES (:name, :email, '', 'ja', 'active', NOW(), NOW())");
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute(["name" => $input["name"] ?? "", "email" => $input["email"] ?? ""]);
        $userId = (int) $pdo->lastInsertId();
        $level = ($input["role"] ?? "") === "管理者" ? 5 : 1;
        // SQL を準備し、あとから値を安全に入れられる形にします。
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
        // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
        respond(current(array_filter(fetch_managers($pdo), fn($m) => $m["id"] === "m" . $adminUserId)));
    }
}
