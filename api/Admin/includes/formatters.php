<?php

/**
 * 管理 API 全体で使う設定、共通レスポンス、初期化処理をまとめます。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * format_dt は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function format_dt(?string $value): string
{
    // DB から来る日時文字列を、管理画面で見やすい形式へ変換します。
    if (!$value) {
        return "-";
    }
    return str_replace("-", "/", substr($value, 0, 16));
}

/**
 * format_dt_iso_tokyo は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function format_dt_iso_tokyo(?string $value): ?string
{
    // DBのDATETIMEは既存仕様では日本時間として保存しているため、ここでは9時間を足さずにAsia/Tokyoを明示します。
    if (!$value) {
        return null;
    }

    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        return (new DateTimeImmutable($value, new DateTimeZone("Asia/Tokyo")))->format(DateTimeInterface::ATOM);
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $error) {
        return null;
    }
}

/**
 * is_cottage_manager_user は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function is_cottage_manager_user(array $item): bool
{
    // コテージ運営向けの特定ユーザーかどうかを、名前やメールのキーワードで判定します。
    return strpos($item["name"] ?? "", "コテージ") !== false
        || strpos($item["email"] ?? "", "cottage.manager") !== false
        || strpos($item["bio"] ?? "", "コテージ") !== false;
}

/**
 * admin_user_time は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function admin_user_time(array $item, string $key): int
{
    // 文字列日時を比較しやすい Unix 時刻へ変換します。
    $value = $item[$key] ?? "";
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($value === "" || $value === "-") {
        return 0;
    }
    return strtotime(str_replace("/", "-", $value)) ?: 0;
}

/**
 * sort_admin_users は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function sort_admin_users(array $items, string $sort): array
{
    // 管理画面の一覧で、並び順や対象抽出を切り替えるための共通ソート処理です。
    if ($sort === "cottageManager") {
        // 条件に合うデータだけを残して、返す内容を絞り込みます。
        $items = array_values(array_filter($items, fn($item) => is_cottage_manager_user($item)));
    } elseif ($sort === "nonCottageManager") {
        // 条件に合うデータだけを残して、返す内容を絞り込みます。
        $items = array_values(array_filter($items, fn($item) => !is_cottage_manager_user($item)));
    }

    usort($items, function ($a, $b) use ($sort) {
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($sort === "lastLoginAt") {
            return admin_user_time($b, "lastLoginAt") <=> admin_user_time($a, "lastLoginAt");
        }
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($sort === "cottageManager" || $sort === "nonCottageManager") {
            return ($a["id"] ?? 0) <=> ($b["id"] ?? 0);
        }
        return admin_user_time($b, "registeredAt") <=> admin_user_time($a, "registeredAt");
    });

    return $items;
}

// users.status を管理画面で見やすい日本語ラベルに変換します。
/**
 * DBの値や入力値を、フロントエンドへ返しやすい形式に変換します。
 *
 * @param ?string $status 呼び出し元から渡される処理対象の値です。
 * @return string 宣言された型に合わせて処理結果を返します。
 * エラー処理は主に呼び出し元、またはこの関数を使うAPI本体側で行います。
 */
function user_status_label(?string $status): string
{
    return [
        "suspended" => "停止中",
        "deleted" => "退会済み",
    ][$status] ?? "通常";
}

// お知らせの状態コードを日本語表示に変換します。
/**
 * DBの値や入力値を、フロントエンドへ返しやすい形式に変換します。
 *
 * @param ?string $status 呼び出し元から渡される処理対象の値です。
 * @return string 宣言された型に合わせて処理結果を返します。
 * エラー処理は主に呼び出し元、またはこの関数を使うAPI本体側で行います。
 */
function notice_status_label(?string $status): string
{
    return [
        "ended" => "終了",
        "draft" => "下書き",
    ][$status] ?? "公開中";
}

// 通報の状態コードを日本語表示に変換します。
/**
 * DBの値や入力値を、フロントエンドへ返しやすい形式に変換します。
 *
 * @param ?string $status 呼び出し元から渡される処理対象の値です。
 * @return string 宣言された型に合わせて処理結果を返します。
 * エラー処理は主に呼び出し元、またはこの関数を使うAPI本体側で行います。
 */
function report_status_label(?string $status): string
{
    return [
        "reviewing" => "確認中",
        "resolved" => "対応済み",
    ][$status] ?? "未対応";
}

// お問い合わせの状態コードを日本語表示に変換します。
/**
 * DBの値や入力値を、フロントエンドへ返しやすい形式に変換します。
 *
 * @param ?string $status 呼び出し元から渡される処理対象の値です。
 * @return string 宣言された型に合わせて処理結果を返します。
 * エラー処理は主に呼び出し元、またはこの関数を使うAPI本体側で行います。
 */
function inquiry_status_label(?string $status): string
{
    return [
        "working" => "対応中",
        "resolved" => "対応済み",
    ][$status] ?? "未対応";
}

// 表示ラベルを DB 保存用のコードに戻すための変換関数です。
/**
 * 同じ処理を複数箇所へ書かないために、このAPI内の共通処理としてまとめています。
 *
 * @param string $label 呼び出し元から渡される処理対象の値です。
 * @param array $map 呼び出し元から渡される処理対象の値です。
 * @param string $default 呼び出し元から渡される処理対象の値です。
 * @return string 宣言された型に合わせて処理結果を返します。
 * エラー処理は主に呼び出し元、またはこの関数を使うAPI本体側で行います。
 */
function to_status_code(string $label, array $map, string $default): string
{
    return $map[$label] ?? $default;
}

