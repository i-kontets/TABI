<?php

function format_dt(?string $value): string
{
    // DB から来る日時文字列を、管理画面で見やすい形式へ変換します。
    if (!$value) {
        return "-";
    }
    return str_replace("-", "/", substr($value, 0, 16));
}

function is_cottage_manager_user(array $item): bool
{
    // コテージ運営向けの特定ユーザーかどうかを、名前やメールのキーワードで判定します。
    return strpos($item["name"] ?? "", "コテージ") !== false
        || strpos($item["email"] ?? "", "cottage.manager") !== false
        || strpos($item["bio"] ?? "", "コテージ") !== false;
}

function admin_user_time(array $item, string $key): int
{
    // 文字列日時を比較しやすい Unix 時刻へ変換します。
    $value = $item[$key] ?? "";
    if ($value === "" || $value === "-") {
        return 0;
    }
    return strtotime(str_replace("/", "-", $value)) ?: 0;
}

function sort_admin_users(array $items, string $sort): array
{
    // 管理画面の一覧で、並び順や対象抽出を切り替えるための共通ソート処理です。
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

