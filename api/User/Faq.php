<?php

/**
 * プロフィール、通知設定、問い合わせ、通報、メール変更など利用者本人の操作を扱う API です。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

// セッションを開始し、ログイン中のユーザー情報をサーバー側で使えるようにします。
session_start();
// フロントエンドへ返すデータ形式や通信ルールを、HTTP ヘッダーとして伝えます。
header("Content-Type: application/json; charset=UTF-8");

// 共通設定や別ファイルの関数を読み込み、この API から使えるようにします。
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/faqSeedData.php";

/**
 * respond は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
try {
    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'faq_items' LIMIT 1");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    // フロントエンドから送られた JSON 文字列を、PHP で扱える配列に変換します。
    $items = $row ? json_decode((string) $row["setting_value"], true) : [];
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!is_array($items)) {
        $items = [];
    }

    // FAQがまだDBに登録されていない場合だけ、初期FAQをDBへ保存してから画面へ返します。
    if (count($items) === 0) {
        $seedItems = tabiFaqSeedItems();
        $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");
        $seedStmt = $pdo->prepare("
            INSERT INTO system_settings (setting_key, setting_value, updated_at)
            VALUES ('faq_items', :setting_value, :updated_at)
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_at = VALUES(updated_at)
        ");
        $seedStmt->bindValue(":setting_value", json_encode($seedItems, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $seedStmt->bindValue(":updated_at", $now);
        $seedStmt->execute();
        $items = $seedItems;
    }

    $keyword = trim((string) ($_GET["keyword"] ?? ""));
    $category = trim((string) ($_GET["category"] ?? ""));

    // 条件に合うデータだけを残して、返す内容を絞り込みます。
    $items = array_values(array_filter($items, function ($item) use ($keyword, $category) {
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!is_array($item)) {
            return false;
        }
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($category !== "" && ($item["category"] ?? "") !== $category) {
            return false;
        }
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($keyword === "") {
            return true;
        }
        $text = ($item["question"] ?? "") . " " . ($item["answer"] ?? "");
        return mb_stripos($text, $keyword) !== false;
    }));

    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => true, "items" => $items]);
// エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
} catch (Throwable $error) {
    // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
    respond(["success" => false, "message" => "FAQの取得に失敗しました。"], 500);
}
