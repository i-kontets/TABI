<?php

function tabiServiceSchedule(): array
{
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

function tabiServiceWindowsForDate(DateTimeImmutable $date, array $schedule): array
{
    $dateKey = $date->format("Y-m-d");

    if (array_key_exists($dateKey, $schedule["special_dates"])) {
        return $schedule["special_dates"][$dateKey];
    }

    $weekday = (int) $date->format("N");
    return $schedule["weekly"][$weekday] ?? [];
}

function tabiBuildDateTime(DateTimeImmutable $date, string $time, DateTimeZone $timezone): DateTimeImmutable
{
    [$hour, $minute] = array_map("intval", explode(":", $time));
    return $date->setTimezone($timezone)->setTime($hour, $minute, 0);
}

function tabiEvaluateServiceSchedule(?DateTimeImmutable $now = null): array
{
    $schedule = tabiServiceSchedule();
    $timezone = new DateTimeZone($schedule["timezone"]);
    $current = ($now ?: new DateTimeImmutable("now", $timezone))->setTimezone($timezone);

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

function tabiIsServiceGuardExempt(): bool
{
    $uri = parse_url($_SERVER["REQUEST_URI"] ?? "", PHP_URL_PATH) ?: "";
    $normalized = strtolower($uri);

    return (
        strpos($normalized, "/api/admin/") !== false ||
        strpos($normalized, "/api/system/status.php") !== false ||
        strpos($normalized, "/api/systemerrors/") !== false
    );
}

function tabiRespondServiceUnavailable(array $status): void
{
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
