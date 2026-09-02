<?php

declare(strict_types=1);

function checklistRespond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function checklistReadJsonBody(): array
{
    $input = json_decode(file_get_contents("php://input"), true);
    return is_array($input) ? $input : $_POST;
}

function checklistRequireMethod(string $expectedMethod): void
{
    if (($_SERVER["REQUEST_METHOD"] ?? "") !== $expectedMethod) {
        checklistRespond([
            "success" => false,
            "message" => "許可されていないメソッドです",
        ], 405);
    }
}

function checklistRequireUserId(): int
{
    if (!isset($_SESSION["user_id"])) {
        checklistRespond([
            "success" => false,
            "message" => "ログインが必要です",
        ], 401);
    }

    return (int) $_SESSION["user_id"];
}

function checklistPositiveInt($value): ?int
{
    $number = filter_var($value, FILTER_VALIDATE_INT);
    return $number !== false && $number > 0 ? (int) $number : null;
}

function checklistTextLength(string $value): int
{
    return function_exists("mb_strlen") ? mb_strlen($value) : strlen($value);
}

function checklistNormalizeChecked($value): ?int
{
    if ($value === null || $value === "") {
        return null;
    }

    if (is_bool($value)) {
        return $value ? 1 : 0;
    }

    $normalized = strtolower((string) $value);
    if (in_array($normalized, ["1", "true", "on", "yes"], true)) {
        return 1;
    }
    if (in_array($normalized, ["0", "false", "off", "no"], true)) {
        return 0;
    }

    return null;
}

function checklistResolveTripId(PDO $pdo, int $userId, ?int $tripId, ?int $groupId): int
{
    if ($tripId) {
        $stmt = $pdo->prepare("
            SELECT t.trip_id
            FROM trips t
            INNER JOIN group_members gm
                ON gm.group_id = t.group_id
               AND gm.user_id = :user_id
               AND gm.invitation_status = 'accepted'
            WHERE t.trip_id = :trip_id
            LIMIT 1
        ");
        $stmt->execute([
            ":user_id" => $userId,
            ":trip_id" => $tripId,
        ]);
    } elseif ($groupId) {
        $stmt = $pdo->prepare("
            SELECT t.trip_id
            FROM trips t
            INNER JOIN group_members gm
                ON gm.group_id = t.group_id
               AND gm.user_id = :user_id
               AND gm.invitation_status = 'accepted'
            WHERE t.group_id = :group_id
            ORDER BY t.updated_at DESC, t.trip_id DESC
            LIMIT 1
        ");
        $stmt->execute([
            ":user_id" => $userId,
            ":group_id" => $groupId,
        ]);
    } else {
        $stmt = $pdo->prepare("
            SELECT t.trip_id
            FROM trips t
            INNER JOIN group_members gm
                ON gm.group_id = t.group_id
               AND gm.user_id = :user_id
               AND gm.invitation_status = 'accepted'
            ORDER BY t.updated_at DESC, t.trip_id DESC
            LIMIT 1
        ");
        $stmt->execute([":user_id" => $userId]);
    }

    $resolvedTripId = $stmt->fetchColumn();

    if (!$resolvedTripId) {
        checklistRespond([
            "success" => false,
            "message" => "対象の旅行が見つかりません",
        ], 404);
    }

    return (int) $resolvedTripId;
}

function checklistFindPacking(PDO $pdo, int $tripId): ?array
{
    $stmt = $pdo->prepare("
        SELECT checklist_id, trip_id, checklist_type, title, created_by
        FROM checklists
        WHERE trip_id = :trip_id
          AND checklist_type = '持ち物'
        ORDER BY checklist_id ASC
        LIMIT 1
    ");
    $stmt->execute([":trip_id" => $tripId]);
    $checklist = $stmt->fetch(PDO::FETCH_ASSOC);

    return $checklist ?: null;
}

function checklistEnsurePacking(PDO $pdo, int $tripId, int $userId): array
{
    $checklist = checklistFindPacking($pdo, $tripId);
    if ($checklist) {
        return $checklist;
    }

    $stmt = $pdo->prepare("
        INSERT INTO checklists (trip_id, checklist_type, title, created_by)
        VALUES (:trip_id, '持ち物', '持ち物リスト', :created_by)
    ");
    $stmt->execute([
        ":trip_id" => $tripId,
        ":created_by" => $userId,
    ]);

    return [
        "checklist_id" => (int) $pdo->lastInsertId(),
        "trip_id" => $tripId,
        "checklist_type" => "持ち物",
        "title" => "持ち物リスト",
        "created_by" => $userId,
    ];
}

function checklistRequireItemAccess(PDO $pdo, int $userId, int $itemId): array
{
    $stmt = $pdo->prepare("
        SELECT
            ci.checklist_item_id,
            ci.checklist_id,
            ci.item_name,
            ci.is_checked,
            ci.assigned_user_id,
            ci.sort_order,
            c.trip_id
        FROM checklist_items ci
        INNER JOIN checklists c ON c.checklist_id = ci.checklist_id
        INNER JOIN trips t ON t.trip_id = c.trip_id
        INNER JOIN group_members gm
            ON gm.group_id = t.group_id
           AND gm.user_id = :user_id
           AND gm.invitation_status = 'accepted'
        WHERE ci.checklist_item_id = :item_id
        LIMIT 1
    ");
    $stmt->execute([
        ":user_id" => $userId,
        ":item_id" => $itemId,
    ]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        checklistRespond([
            "success" => false,
            "message" => "対象の持ちものが見つかりません",
        ], 404);
    }

    return $item;
}

function checklistFormatItem(array $row): array
{
    $assigneeName = $row["assignee_name"] ?? null;

    return [
        "id" => (int) $row["checklist_item_id"],
        "checklist_item_id" => (int) $row["checklist_item_id"],
        "checklist_id" => (int) $row["checklist_id"],
        "name" => $row["item_name"] ?? "",
        "item_name" => $row["item_name"] ?? "",
        "note" => "",
        "checked" => (bool) $row["is_checked"],
        "is_checked" => (bool) $row["is_checked"],
        "assigned_user_id" => $row["assigned_user_id"] !== null ? (int) $row["assigned_user_id"] : null,
        "assignee" => $assigneeName ?: "",
        "sort_order" => $row["sort_order"] !== null ? (int) $row["sort_order"] : null,
    ];
}

function checklistReadItemIds(array $input): array
{
    $rawItemIds = $input["item_ids"] ?? $input["itemIds"] ?? null;
    $itemIds = is_array($rawItemIds)
        ? array_values(array_filter(array_map("checklistPositiveInt", $rawItemIds)))
        : [];

    $singleItemId = checklistPositiveInt($input["item_id"] ?? $input["checklist_item_id"] ?? $input["id"] ?? null);
    if ($singleItemId) {
        $itemIds[] = $singleItemId;
    }

    return array_values(array_unique($itemIds));
}
