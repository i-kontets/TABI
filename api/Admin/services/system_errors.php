<?php

/**
 * 管理 API から使う補助サービス処理をまとめます。
 *
 * 主な流れ:
 * 1. リクエストやセッションなど、処理に必要な情報を読み取る
 * 2. 入力値や権限を確認し、必要に応じてデータベースへ問い合わせる
 * 3. 処理結果を JSON などの形でフロントエンドへ返す
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */

/**
 * systemErrorColumnExists は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function systemErrorColumnExists(PDO $pdo, string $column): bool
{
    static $cache = [];
    $key = $column;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    // SQL を準備し、あとから値を安全に入れられる形にします。
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'system_errors'
          AND COLUMN_NAME = :column_name
    ");
    // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
    $stmt->execute(["column_name" => $column]);

    return $cache[$key] = ((int) $stmt->fetchColumn() > 0);
}

/**
 * ensureSystemErrorsTable は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
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

    // 複数のデータを1件ずつ取り出し、同じ確認や変換を繰り返します。
    foreach ($columns as $column => $sql) {
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!systemErrorColumnExists($pdo, $column)) {
            // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
            try {
                $pdo->exec($sql);
            // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
            } catch (Throwable $error) {
                error_log("Failed to add system_errors.{$column}: " . $error->getMessage());
            }
        }
    }
}

/**
 * stripSensitiveUrlParts は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function stripSensitiveUrlParts(?string $url): ?string
{
    $url = trim((string) $url);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($url === "") {
        return null;
    }

    $parts = parse_url($url);
    $removeQueryKeys = ["_", "t", "ts", "timestamp", "cache", "cacheBust", "cache_bust", "v"];
    $sensitiveQueryKeys = ["token", "auth", "authorization", "email", "code", "verification_code", "password"];

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($parts === false || !isset($parts["scheme"], $parts["host"])) {
        $relativeParts = parse_url($url);
        $path = is_array($relativeParts) && isset($relativeParts["path"])
            ? $relativeParts["path"]
            : preg_replace('/[?#].*$/', '', $url);
        $queryText = "";
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (is_array($relativeParts) && isset($relativeParts["query"])) {
            parse_str($relativeParts["query"], $queryParams);
            ksort($queryParams);
            $safeQuery = [];
            // 複数のデータを1件ずつ取り出し、同じ確認や変換を繰り返します。
            foreach ($queryParams as $key => $value) {
                $keyText = (string) $key;
                // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
                if (in_array($keyText, $removeQueryKeys, true) || in_array(strtolower($keyText), $sensitiveQueryKeys, true)) {
                    continue;
                }
                $safeQuery[$keyText] = $value;
            }
            $queryText = http_build_query($safeQuery);
        }

        return rtrim((string) $path, "/") . ($queryText !== "" ? "?" . $queryText : "");
    }

    $result = $parts["scheme"] . "://" . $parts["host"];

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (isset($parts["port"])) {
        $result .= ":" . $parts["port"];
    }

    $result .= rtrim($parts["path"] ?? "", "/");

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (isset($parts["query"])) {
        parse_str($parts["query"], $queryParams);
        ksort($queryParams);
        $safeQuery = [];
        // 複数のデータを1件ずつ取り出し、同じ確認や変換を繰り返します。
        foreach ($queryParams as $key => $value) {
            $keyText = (string) $key;
            // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
            if (in_array($keyText, $removeQueryKeys, true) || in_array(strtolower($keyText), $sensitiveQueryKeys, true)) {
                continue;
            }
            $safeQuery[$keyText] = $value;
        }
        $queryText = http_build_query($safeQuery);
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($queryText !== "") {
            $result .= "?" . $queryText;
        }
    }

    return $result;
}

/**
 * normalizeSystemErrorPath は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function normalizeSystemErrorPath(?string $url): ?string
{
    $url = stripSensitiveUrlParts($url);

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$url) {
        return null;
    }

    $parts = parse_url($url);
    $path = is_array($parts) && isset($parts["path"]) ? $parts["path"] : $url;
    $path = preg_replace('/[?#].*$/', '', trim((string) $path));

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($path === "") {
        return null;
    }

    $normalizedPath = "/" . ltrim(rtrim($path, "/"), "/");
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (is_array($parts) && isset($parts["query"]) && trim((string) $parts["query"]) !== "") {
        $normalizedPath .= "?" . trim((string) $parts["query"]);
    }

    return $normalizedPath;
}

/**
 * buildSystemErrorRecoveryKey は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function buildSystemErrorRecoveryKey(?string $source, ?string $requestMethod, ?string $requestUrl, ?string $pagePath, ?string $errorCode): ?string
{
    $requestPath = normalizeSystemErrorPath($requestUrl);
    $pagePath = normalizeSystemErrorPath($pagePath) ?: trim((string) $pagePath);
    $source = trim((string) ($source ?: "frontend"));
    $requestMethod = strtoupper(trim((string) ($requestMethod ?: "GET")));
    $errorCode = trim((string) ($errorCode ?: "API_HTTP_ERROR"));

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$requestPath || $pagePath === "") {
        return null;
    }

    /* HTTPステータスやエラーメッセージを含めず、同じAPI処理だけを判定できる安定キーを作ります。 */
    return implode("|", [$source, $requestMethod, $requestPath, $pagePath, $errorCode]);
}

/**
 * normalizedSystemErrorDetail は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function normalizedSystemErrorDetail($detail): array
{
    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (is_array($detail)) {
        return $detail;
    }

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if ($detail === null || $detail === "") {
        return [];
    }

    return ["detail" => (string) $detail];
}

/**
 * systemErrorResolvedSetSql は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function systemErrorResolvedSetSql(PDO $pdo): string
{
    $setSql = "status = 'resolved', resolved_at = NOW()";

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (systemErrorColumnExists($pdo, "updated_at")) {
        /* updated_atカラムがあるDBでは、自動解消した時刻も更新日時として残します。 */
        $setSql .= ", updated_at = NOW()";
    }

    return $setSql;
}

/**
 * logSystemError は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function logSystemError(string $source, string $level, string $message, $detail = null, $userId = null, $url = null): ?int
{
    global $pdo;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$pdo instanceof PDO) {
        error_log("System error not saved: PDO is not available. {$source} {$level} {$message}");
        return null;
    }

    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        ensureSystemErrorsTable($pdo);

        $detailData = normalizedSystemErrorDetail($detail);
        $pagePath = $detailData["page_path"] ?? null;
        $requestUrl = stripSensitiveUrlParts($detailData["request_url"] ?? null);
        $errorCode = $detailData["error_code"] ?? null;
        $fingerprint = $detailData["fingerprint"] ?? null;
        $requestMethod = strtoupper(trim((string) ($detailData["request_method"] ?? "")));
        $recoveryKey = trim((string) ($detailData["recovery_key"] ?? ""));
        $httpStatus = isset($detailData["http_status"]) && is_numeric($detailData["http_status"])
            ? (int) $detailData["http_status"]
            : null;

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($recoveryKey === "") {
            $recoveryKey = buildSystemErrorRecoveryKey($detailData["source"] ?? $source, $requestMethod, $requestUrl, $pagePath, $errorCode) ?? "";
            // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
            if ($recoveryKey !== "") {
                /* 古い登録経路でも、あとで同じAPIの成功を判定できるようdetailへ補完します。 */
                $detailData["recovery_key"] = $recoveryKey;
            }
        }

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
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
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($detail !== null) {
            // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
            if (isset($detailData["request_url"])) {
                $detailData["request_url"] = $requestUrl;
            }
            // 処理結果をフロントエンドが読み取りやすい JSON 形式で返します。
            $detailText = json_encode($detailData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $legacyUrl = stripSensitiveUrlParts($url);
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($legacyUrl === null && isset($_SERVER["REQUEST_URI"])) {
            $legacyUrl = stripSensitiveUrlParts($_SERVER["REQUEST_URI"]);
        }

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($fingerprint && systemErrorColumnExists($pdo, "fingerprint")) {
            // SQL を準備し、あとから値を安全に入れられる形にします。
            $dedupeStmt = $pdo->prepare("
                SELECT error_id
                FROM system_errors
                WHERE fingerprint = :fingerprint
                ORDER BY error_id DESC
                LIMIT 1
            ");
            // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
            $dedupeStmt->execute(["fingerprint" => $fingerprint]);
            $existingId = (int) $dedupeStmt->fetchColumn();

            // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
            if ($existingId > 0 && systemErrorColumnExists($pdo, "occurrence_count")) {
                $reopenSetSql = "
                        occurrence_count = occurrence_count + 1,
                        last_occurred_at = NOW(),
                        status = 'unresolved',
                        resolved_at = NULL,
                        detail = :detail,
                        user_id = COALESCE(:user_id, user_id)";
                // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
                if (systemErrorColumnExists($pdo, "updated_at")) {
                    /* 対応済み後に再発した場合も、更新日時を最新にします。 */
                    $reopenSetSql .= ",
                        updated_at = NOW()";
                }

                // SQL を準備し、あとから値を安全に入れられる形にします。
                $updateStmt = $pdo->prepare("
                    UPDATE system_errors
                    SET {$reopenSetSql}
                    WHERE error_id = :error_id
                ");
                // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
                $updateStmt->bindValue(":detail", $detailText);
                // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
                if ($userId === null || $userId === "") {
                    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
                    $updateStmt->bindValue(":user_id", null, PDO::PARAM_NULL);
                } else {
                    // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
                    $updateStmt->bindValue(":user_id", (int) $userId, PDO::PARAM_INT);
                }
                // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
                $updateStmt->bindValue(":error_id", $existingId, PDO::PARAM_INT);
                // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
                $updateStmt->execute();

                // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
                if (function_exists("sendRealtimeEvent")) {
                    // WebSocket通知を送ります。DB更新後に呼ぶことで、他の画面へ「変更があった」ことを伝えます。
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

        // SQL を準備し、あとから値を安全に入れられる形にします。
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
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":source", $source);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":level", $level);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":message", $message);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":detail", $detailText);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":url", $legacyUrl);
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($userId === null || $userId === "") {
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $stmt->bindValue(":user_id", null, PDO::PARAM_NULL);
        } else {
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $stmt->bindValue(":user_id", (int) $userId, PDO::PARAM_INT);
        }
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":error_type", $detailData["error_type"] ?? null);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":error_code", $errorCode);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":page_path", $pagePath);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":request_url", $requestUrl);
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($httpStatus === null) {
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $stmt->bindValue(":http_status", null, PDO::PARAM_NULL);
        } else {
            // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
            $stmt->bindValue(":http_status", $httpStatus, PDO::PARAM_INT);
        }
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":user_agent", $detailData["user_agent"] ?? null);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":stack_trace", $detailData["stack_trace"] ?? null);
        // SQL 内の目印に値を割り当て、入力値が SQL 命令として実行されないようにします。
        $stmt->bindValue(":fingerprint", $fingerprint);
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute();

        $errorId = (int) $pdo->lastInsertId();
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($errorId > 0 && function_exists("sendRealtimeEvent")) {
            sendRealtimeEvent("admin:global", "system_error_created", [
                "error_id" => $errorId,
                "errorCode" => $errorCode,
                "occurrenceCount" => 1,
                "occurredAt" => date("Y-m-d H:i:s"),
            ], false);
        }

        return $errorId > 0 ? $errorId : null;
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $error) {
        error_log("Failed to save system error: " . $error->getMessage());
        return null;
    }
}

/**
 * resolveSystemErrorByFingerprint は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolveSystemErrorByFingerprint(string $fingerprint, ?string $requestUrl = null, ?string $pagePath = null, ?int $httpStatus = null): int
{
    global $pdo;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$pdo instanceof PDO || $fingerprint === "" || !systemErrorColumnExists($pdo, "fingerprint")) {
        return 0;
    }

    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        ensureSystemErrorsTable($pdo);
        $requestUrl = stripSensitiveUrlParts($requestUrl);
        $pagePath = trim((string) $pagePath);

        $where = ["fingerprint = :fingerprint", "status = 'unresolved'"];
        $params = ["fingerprint" => $fingerprint];

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($requestUrl) {
            $where[] = "(request_url = :request_url OR request_url IS NULL OR request_url = '')";
            $params["request_url"] = $requestUrl;
        }
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($pagePath !== "") {
            $where[] = "(page_path = :page_path OR page_path IS NULL OR page_path = '')";
            $params["page_path"] = $pagePath;
        }
        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($httpStatus !== null) {
            $where[] = "(http_status >= 500 OR http_status IS NULL)";
        }

        // SQL を準備し、あとから値を安全に入れられる形にします。
        $stmt = $pdo->prepare("
            UPDATE system_errors
            SET " . systemErrorResolvedSetSql($pdo) . "
            WHERE " . implode(" AND ", $where) . "
        ");
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute($params);
        $count = $stmt->rowCount();

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($count > 0 && function_exists("sendRealtimeEvent")) {
            sendRealtimeEvent("admin:global", "system_error_resolved", [
                "fingerprint" => $fingerprint,
                "resolvedAt" => date("Y-m-d H:i:s"),
            ], false);
        }

        return $count;
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $error) {
        error_log("Failed to resolve system error: " . $error->getMessage());
        return 0;
    }
}

/**
 * resolveSystemErrorsByRecoveryContext は、この API 内で何度も使う処理をまとめた関数です。
 * 引数として受け取った値をもとに、確認・取得・更新などの結果を返します。
 */
function resolveSystemErrorsByRecoveryContext(?string $requestUrl, ?string $pagePath, ?string $errorCode = "API_HTTP_ERROR", ?string $source = "frontend", ?string $requestMethod = null, ?string $recoveryKey = null): int
{
    global $pdo;

    // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
    if (!$pdo instanceof PDO || !systemErrorColumnExists($pdo, "request_url") || !systemErrorColumnExists($pdo, "page_path")) {
        return 0;
    }

    // データベース処理などでエラーが起きる可能性があるため、例外を受け取れる形で実行します。
    try {
        ensureSystemErrorsTable($pdo);

        $requestPath = normalizeSystemErrorPath($requestUrl);
        $pagePath = normalizeSystemErrorPath($pagePath) ?: trim((string) $pagePath);
        $errorCode = trim((string) $errorCode);
        $source = trim((string) $source);
        $requestMethod = strtoupper(trim((string) $requestMethod));
        $recoveryKey = trim((string) $recoveryKey);

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if (!$requestPath) {
            return 0;
        }

        $conditions = [
            "status = 'unresolved'",
            "request_url IS NOT NULL",
            "request_url <> ''",
            "(request_url = :request_url OR request_url LIKE :absolute_request_url)",
        ];
        $params = [
            "request_url" => $requestPath,
            "absolute_request_url" => "%{$requestPath}",
        ];

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($pagePath !== "") {
            /*
             * フロントエンド由来のエラーは、同じ画面内の別APIを誤って解決しないように
             * page_path も一致条件に含めます。バックエンドだけで起きたエラーは
             * page_path が保存されないことがあるため、その場合は request_url と error_code を優先します。
             */
            $conditions[] = "page_path = :page_path";
            $params["page_path"] = $pagePath;
        }

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($errorCode !== "" && systemErrorColumnExists($pdo, "error_code")) {
            $conditions[] = "error_code = :error_code";
            $params["error_code"] = $errorCode;
        }

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($source !== "" && systemErrorColumnExists($pdo, "source")) {
            $conditions[] = "(source = :source OR source = 'frontend')";
            $params["source"] = $source;
        }

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($requestMethod !== "") {
            $conditions[] = "(detail IS NULL OR LOCATE('\"request_method\"', detail) = 0 OR LOCATE(:request_method_json, detail) > 0)";
            $params["request_method_json"] = '"request_method":"' . $requestMethod . '"';
        }

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($recoveryKey !== "") {
            /* 新しいレコードは recovery_key も一致確認し、別APIを誤って対応済みにしないようにします。 */
            $conditions[] = "(detail IS NULL OR LOCATE('\"recovery_key\"', detail) = 0 OR LOCATE(:recovery_key_json, detail) > 0)";
            $params["recovery_key_json"] = '"recovery_key":"' . $recoveryKey . '"';
        }

        // SQL を準備し、あとから値を安全に入れられる形にします。
        $stmt = $pdo->prepare("
            UPDATE system_errors
            SET " . systemErrorResolvedSetSql($pdo) . "
            WHERE " . implode(" AND ", $conditions) . "
        ");
        // 準備した SQL を実行し、データベースへの取得・登録・更新を行います。
        $stmt->execute($params);
        $count = $stmt->rowCount();

        // ここで条件を確認し、正しくないリクエストや対象外の処理を分けます。
        if ($count > 0 && function_exists("sendRealtimeEvent")) {
            sendRealtimeEvent("admin:global", "system_error_resolved", [
                "requestUrl" => $requestPath,
                "pagePath" => $pagePath,
                "resolvedAt" => date("Y-m-d H:i:s"),
            ], false);
        }

        return $count;
    // エラーが起きた場合は、詳細をログに残し、利用者には安全なメッセージを返します。
    } catch (Throwable $error) {
        error_log("Failed to resolve system error by recovery context: " . $error->getMessage());
        return 0;
    }
}
