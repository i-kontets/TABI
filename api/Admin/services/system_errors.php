<?php

function systemErrorColumnExists(PDO $pdo, string $column): bool
{
    static $cache = [];
    $key = $column;

    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'system_errors'
          AND COLUMN_NAME = :column_name
    ");
    $stmt->execute(["column_name" => $column]);

    return $cache[$key] = ((int) $stmt->fetchColumn() > 0);
}

function ensureSystemErrorsTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS system_errors (
            error_id BIGINT NOT NULL AUTO_INCREMENT,
            source VARCHAR(80) NOT NULL,
            level VARCHAR(30) NOT NULL DEFAULT 'error',
            message VARCHAR(500) NOT NULL,
            detail TEXT NULL,
            url VARCHAR(1000) NULL,
            user_id BIGINT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'unresolved',
            error_type VARCHAR(80) NULL,
            error_code VARCHAR(120) NULL,
            page_path VARCHAR(500) NULL,
            request_url VARCHAR(1000) NULL,
            http_status INT NULL,
            user_agent VARCHAR(500) NULL,
            stack_trace TEXT NULL,
            fingerprint VARCHAR(255) NULL,
            occurrence_count INT NOT NULL DEFAULT 1,
            first_occurred_at DATETIME NULL,
            last_occurred_at DATETIME NULL,
            created_at DATETIME NOT NULL,
            resolved_at DATETIME NULL,
            PRIMARY KEY (error_id),
            KEY idx_system_errors_status_created (status, created_at),
            KEY idx_system_errors_fingerprint (fingerprint)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $columns = [
        "error_type" => "ALTER TABLE system_errors ADD COLUMN error_type VARCHAR(80) NULL",
        "error_code" => "ALTER TABLE system_errors ADD COLUMN error_code VARCHAR(120) NULL",
        "page_path" => "ALTER TABLE system_errors ADD COLUMN page_path VARCHAR(500) NULL",
        "request_url" => "ALTER TABLE system_errors ADD COLUMN request_url VARCHAR(1000) NULL",
        "http_status" => "ALTER TABLE system_errors ADD COLUMN http_status INT NULL",
        "user_agent" => "ALTER TABLE system_errors ADD COLUMN user_agent VARCHAR(500) NULL",
        "stack_trace" => "ALTER TABLE system_errors ADD COLUMN stack_trace TEXT NULL",
        "fingerprint" => "ALTER TABLE system_errors ADD COLUMN fingerprint VARCHAR(255) NULL",
        "occurrence_count" => "ALTER TABLE system_errors ADD COLUMN occurrence_count INT NOT NULL DEFAULT 1",
        "first_occurred_at" => "ALTER TABLE system_errors ADD COLUMN first_occurred_at DATETIME NULL",
        "last_occurred_at" => "ALTER TABLE system_errors ADD COLUMN last_occurred_at DATETIME NULL",
        "resolved_at" => "ALTER TABLE system_errors ADD COLUMN resolved_at DATETIME NULL",
    ];

    foreach ($columns as $column => $sql) {
        if (!systemErrorColumnExists($pdo, $column)) {
            try {
                $pdo->exec($sql);
            } catch (Throwable $error) {
                error_log("Failed to add system_errors.{$column}: " . $error->getMessage());
            }
        }
    }
}

function stripSensitiveUrlParts(?string $url): ?string
{
    $url = trim((string) $url);

    if ($url === "") {
        return null;
    }

    $parts = parse_url($url);

    if ($parts === false || !isset($parts["scheme"], $parts["host"])) {
        return preg_replace('/[?#].*$/', '', $url);
    }

    $result = $parts["scheme"] . "://" . $parts["host"];

    if (isset($parts["port"])) {
        $result .= ":" . $parts["port"];
    }

    $result .= $parts["path"] ?? "";

    return $result;
}

function normalizedSystemErrorDetail($detail): array
{
    if (is_array($detail)) {
        return $detail;
    }

    if ($detail === null || $detail === "") {
        return [];
    }

    return ["detail" => (string) $detail];
}

function logSystemError(string $source, string $level, string $message, $detail = null, $userId = null, $url = null): ?int
{
    global $pdo;

    if (!$pdo instanceof PDO) {
        error_log("System error not saved: PDO is not available. {$source} {$level} {$message}");
        return null;
    }

    try {
        ensureSystemErrorsTable($pdo);

        $detailData = normalizedSystemErrorDetail($detail);
        $pagePath = $detailData["page_path"] ?? null;
        $requestUrl = stripSensitiveUrlParts($detailData["request_url"] ?? null);
        $errorCode = $detailData["error_code"] ?? null;
        $fingerprint = $detailData["fingerprint"] ?? null;
        $httpStatus = isset($detailData["http_status"]) && is_numeric($detailData["http_status"])
            ? (int) $detailData["http_status"]
            : null;

        if (!$fingerprint && $errorCode) {
            $fingerprint = hash("sha256", implode("|", [
                $errorCode,
                $pagePath ?: "",
                $detailData["source"] ?? $source,
                $requestUrl ?: "",
                mb_substr((string) $message, 0, 120),
            ]));
        }

        $detailText = null;
        if ($detail !== null) {
            if (isset($detailData["request_url"])) {
                $detailData["request_url"] = $requestUrl;
            }
            $detailText = json_encode($detailData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $legacyUrl = stripSensitiveUrlParts($url);
        if ($legacyUrl === null && isset($_SERVER["REQUEST_URI"])) {
            $legacyUrl = stripSensitiveUrlParts($_SERVER["REQUEST_URI"]);
        }

        if ($fingerprint && systemErrorColumnExists($pdo, "fingerprint")) {
            $dedupeStmt = $pdo->prepare("
                SELECT error_id
                FROM system_errors
                WHERE fingerprint = :fingerprint
                  AND status = 'unresolved'
                  AND COALESCE(last_occurred_at, created_at) >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
                ORDER BY error_id DESC
                LIMIT 1
            ");
            $dedupeStmt->execute(["fingerprint" => $fingerprint]);
            $existingId = (int) $dedupeStmt->fetchColumn();

            if ($existingId > 0 && systemErrorColumnExists($pdo, "occurrence_count")) {
                $updateStmt = $pdo->prepare("
                    UPDATE system_errors
                    SET occurrence_count = occurrence_count + 1,
                        last_occurred_at = NOW(),
                        detail = :detail,
                        user_id = COALESCE(:user_id, user_id)
                    WHERE error_id = :error_id
                ");
                $updateStmt->bindValue(":detail", $detailText);
                if ($userId === null || $userId === "") {
                    $updateStmt->bindValue(":user_id", null, PDO::PARAM_NULL);
                } else {
                    $updateStmt->bindValue(":user_id", (int) $userId, PDO::PARAM_INT);
                }
                $updateStmt->bindValue(":error_id", $existingId, PDO::PARAM_INT);
                $updateStmt->execute();

                if (function_exists("sendRealtimeEvent")) {
                    sendRealtimeEvent("admin:global", "system_error_created", [
                        "error_id" => $existingId,
                        "errorCode" => $errorCode,
                        "occurrenceCount" => null,
                        "occurredAt" => date("Y-m-d H:i:s"),
                    ], false);
                }

                return $existingId;
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO system_errors (
                source,
                level,
                message,
                detail,
                url,
                user_id,
                error_type,
                error_code,
                page_path,
                request_url,
                http_status,
                user_agent,
                stack_trace,
                fingerprint,
                occurrence_count,
                first_occurred_at,
                last_occurred_at,
                status,
                created_at
            ) VALUES (
                :source,
                :level,
                :message,
                :detail,
                :url,
                :user_id,
                :error_type,
                :error_code,
                :page_path,
                :request_url,
                :http_status,
                :user_agent,
                :stack_trace,
                :fingerprint,
                1,
                NOW(),
                NOW(),
                'unresolved',
                NOW()
            )
        ");
        $stmt->bindValue(":source", $source);
        $stmt->bindValue(":level", $level);
        $stmt->bindValue(":message", $message);
        $stmt->bindValue(":detail", $detailText);
        $stmt->bindValue(":url", $legacyUrl);
        if ($userId === null || $userId === "") {
            $stmt->bindValue(":user_id", null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(":user_id", (int) $userId, PDO::PARAM_INT);
        }
        $stmt->bindValue(":error_type", $detailData["error_type"] ?? null);
        $stmt->bindValue(":error_code", $errorCode);
        $stmt->bindValue(":page_path", $pagePath);
        $stmt->bindValue(":request_url", $requestUrl);
        if ($httpStatus === null) {
            $stmt->bindValue(":http_status", null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(":http_status", $httpStatus, PDO::PARAM_INT);
        }
        $stmt->bindValue(":user_agent", $detailData["user_agent"] ?? null);
        $stmt->bindValue(":stack_trace", $detailData["stack_trace"] ?? null);
        $stmt->bindValue(":fingerprint", $fingerprint);
        $stmt->execute();

        $errorId = (int) $pdo->lastInsertId();
        if ($errorId > 0 && function_exists("sendRealtimeEvent")) {
            sendRealtimeEvent("admin:global", "system_error_created", [
                "error_id" => $errorId,
                "errorCode" => $errorCode,
                "occurrenceCount" => 1,
                "occurredAt" => date("Y-m-d H:i:s"),
            ], false);
        }

        return $errorId > 0 ? $errorId : null;
    } catch (Throwable $error) {
        error_log("Failed to save system error: " . $error->getMessage());
        return null;
    }
}
