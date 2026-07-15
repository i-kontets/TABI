<?php
/**
 * DB稼働予定を日本時間で管理するファイルです。
 *
 * ここでは「本来DBが動いている予定か」を計算します。
 * ただし、画面を止める最終判断は実際のDB接続結果を優先します。
 * そのため、このファイルの結果は主に「予定停止」か「予定外障害」かの分類に使われます。
 */

function tabiServiceSchedule(): array {
    // weekly は曜日ごとの稼働時間です。DateTime の N 形式に合わせ、1=月曜日、7=日曜日です。
    // special_dates は曜日ルールより優先される特別稼働日です。
    return [
        "timezone" => "Asia/Tokyo",
        "weekly" => [
            1 => [["08:00", "20:00"]],
            2 => [],
            3 => [["08:00", "20:00"]],
            4 => [["08:00", "20:00"]],
            5 => [["08:00", "12:00"]],
            6 => [],
            7 => [],
        ],
        "special_dates" => [
            "2026-08-15" => [["12:00", "23:00"]],
            "2026-08-16" => [["12:00", "23:00"]],
        ],
    ];
}

function tabiServiceWindowsForDate(DateTimeImmutable $date, array $schedule): array {
    $dateKey = $date->format("Y-m-d");

    // 特別稼働日が登録されている日は、通常の曜日スケジュールではなく特別設定を使います。
    if (array_key_exists($dateKey, $schedule["special_dates"])) {
        return $schedule["special_dates"][$dateKey];
    }

    $weekday = (int) $date->format("N");
    return $schedule["weekly"][$weekday] ?? [];
}

function tabiBuildDateTime(DateTimeImmutable $date, string $time, DateTimeZone $timezone): DateTimeImmutable {
    // "08:00" のような文字列を、比較しやすい DateTimeImmutable に変換します。
    [$hour, $minute] = array_map("intval", explode(":", $time));
    return $date->setTimezone($timezone)->setTime($hour, $minute, 0);
}

function tabiEvaluateServiceSchedule(?DateTimeImmutable $now = null): array {
    // テスト時は $now を渡せます。通常は現在時刻を Asia/Tokyo にそろえて判定します。
    $schedule = tabiServiceSchedule();
    $timezone = new DateTimeZone($schedule["timezone"]);
    $current = ($now ?: new DateTimeImmutable("now", $timezone))->setTimezone($timezone);

    // 今日の稼働枠を1つずつ確認し、現在時刻が枠内なら available=true を返します。
    $todayWindows = tabiServiceWindowsForDate($current, $schedule);
    foreach ($todayWindows as $window) {
        [$openTime, $closeTime] = $window;
        $openAt = tabiBuildDateTime($current, $openTime, $timezone);
        $closeAt = tabiBuildDateTime($current, $closeTime, $timezone);

        if ($current >= $openAt && $current < $closeAt) {
            return [
                "available" => true,
                "reason" => "AVAILABLE",
                "now" => $current->format(DateTimeInterface::ATOM),
                "nextOpenAt" => null,
                "nextCloseAt" => $closeAt->format(DateTimeInterface::ATOM),
                "timezone" => $schedule["timezone"],
            ];
        }
    }

    $nextOpenAt = null;
    // 現在が停止予定時間の場合、次にDBが起動する予定時刻を最大370日先まで探します。
    for ($offset = 0; $offset <= 370; $offset++) {
        $date = $current->modify("+{$offset} days");
        $windows = tabiServiceWindowsForDate($date, $schedule);

        foreach ($windows as $window) {
            $openAt = tabiBuildDateTime($date, $window[0], $timezone);

            if ($openAt > $current && ($nextOpenAt === null || $openAt < $nextOpenAt)) {
                $nextOpenAt = $openAt;
            }
        }

        if ($nextOpenAt !== null) {
            break;
        }
    }

    return [
        "available" => false,
        "reason" => "OUTSIDE_SERVICE_HOURS",
        "now" => $current->format(DateTimeInterface::ATOM),
        "nextOpenAt" => $nextOpenAt ? $nextOpenAt->format(DateTimeInterface::ATOM) : null,
        "nextCloseAt" => null,
        "timezone" => $schedule["timezone"],
    ];
}

function tabiIsServiceGuardExempt(): bool {
    // DB停止中でも状態確認APIとエラー記録APIは動かしたいので、ガード対象から外します。
    $uri = parse_url($_SERVER["REQUEST_URI"] ?? "", PHP_URL_PATH) ?: "";
    $normalized = strtolower($uri);

    return (
        strpos($normalized, "/api/system/status.php") !== false ||
        strpos($normalized, "/api/systemerrors/") !== false
    );
}

function tabiRespondServiceUnavailable(array $status): void {
    // 旧処理との互換用関数です。現在はDB接続結果を優先するため、通常の事前ブロックでは使いません。
    http_response_code(503);

    if (!headers_sent()) {
        header("Content-Type: application/json; charset=UTF-8");
        header("Cache-Control: no-store, no-cache, must-revalidate");
        header("Pragma: no-cache");

        if (!empty($status["nextOpenAt"])) {
            $retryAt = DateTimeImmutable::createFromFormat(DateTimeInterface::ATOM, $status["nextOpenAt"]);
            if ($retryAt instanceof DateTimeImmutable) {
                $seconds = max(60, $retryAt->getTimestamp() - time());
                header("Retry-After: {$seconds}");
            }
        }
    }

    echo json_encode([
        "success" => false,
        "code" => $status["reason"],
        "message" => "現在はサービス利用時間外です。",
        "now" => $status["now"],
        "nextOpenAt" => $status["nextOpenAt"],
        "timezone" => $status["timezone"],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
