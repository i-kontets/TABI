<?php

function logSystemError(string $source, string $level, string $message, $detail = null, $userId = null, $url = null): ?int
{
    global $pdo;

    if (!$pdo instanceof PDO) {
        error_log("System error not saved: PDO is not available. {$source} {$level} {$message}");
        return null;
    }

    try {
        $detailText = null;
        if ($detail !== null) {
            $detailText = is_string($detail)
                ? $detail
                : json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $requestUrl = $url;
        if ($requestUrl === null && isset($_SERVER["REQUEST_URI"])) {
            $requestUrl = $_SERVER["REQUEST_URI"];
        }

        $stmt = $pdo->prepare("
            INSERT INTO system_errors (
                source,
                level,
                message,
                detail,
                url,
                user_id,
                status,
                created_at
            ) VALUES (
                :source,
                :level,
                :message,
                :detail,
                :url,
                :user_id,
                'unresolved',
                NOW()
            )
        ");
        $stmt->bindValue(":source", $source);
        $stmt->bindValue(":level", $level);
        $stmt->bindValue(":message", $message);
        $stmt->bindValue(":detail", $detailText);
        $stmt->bindValue(":url", $requestUrl);
        if ($userId === null || $userId === "") {
            $stmt->bindValue(":user_id", null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(":user_id", (int) $userId, PDO::PARAM_INT);
        }
        $stmt->execute();

        $errorId = (int) $pdo->lastInsertId();
        if ($errorId > 0 && function_exists("sendRealtimeEvent")) {
            sendRealtimeEvent("admin:global", "system_error_created", [
                "error_id" => $errorId,
            ], false);
        }

        return $errorId > 0 ? $errorId : null;
    } catch (Throwable $error) {
        error_log("Failed to save system error: " . $error->getMessage());
        return null;
    }
}
