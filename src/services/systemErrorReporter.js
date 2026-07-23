/**
 * 画面側で起きたエラーをサーバーへ送るための処理をまとめます。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */
import {
    isAdminPath,
    isMaintenanceCode,
    isMaintenancePath,
    saveMaintenanceReason,
    saveReturnPath,
} from './serviceStatus';

const endpoint = `${import.meta.env.BASE_URL}api/SystemErrors/Report.php`;
const resolveEndpoint = `${import.meta.env.BASE_URL}api/SystemErrors/Resolve.php`;
const recentFingerprints = new Map();
const unresolvedRecoveryKeys = new Set();
const unresolvedRecoveryStorageKey = 'tabi:unresolved-system-error-recovery-keys';
const suppressMs = 60 * 1000;
const systemErrorBroadcastChannel = 'tabi-admin-system-errors';

const removableQueryKeys = new Set([
    '_',
    't',
    'ts',
    'timestamp',
    'cache',
    'cacheBust',
    'cache_bust',
    'v',
]);

const sensitiveQueryKeys = new Set([
    'token',
    'auth',
    'authorization',
    'email',
    'code',
    'verification_code',
    'password',
]);

/**
 * loadUnresolvedRecoveryKeys は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function loadUnresolvedRecoveryKeys() {
    // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
    try {
        const savedKeys = JSON.parse(sessionStorage.getItem(unresolvedRecoveryStorageKey) || '[]');
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (Array.isArray(savedKeys)) {
            savedKeys.forEach((key) => {
                // ここで条件を確認し、状況に合う処理だけを実行します。
                if (typeof key === 'string' && key !== '') {
                    unresolvedRecoveryKeys.add(key);
                }
            });
        }
    // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
    } catch {
        /* 保存済みデータが壊れていても、エラー監視自体は止めないようにします。 */
    }
}

/**
 * saveUnresolvedRecoveryKeys は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function saveUnresolvedRecoveryKeys() {
    // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
    try {
        sessionStorage.setItem(unresolvedRecoveryStorageKey, JSON.stringify([...unresolvedRecoveryKeys]));
    // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
    } catch {
        /* sessionStorage が使えない環境でも、画面を開いている間の Set だけで動かします。 */
    }
}

/**
 * rememberUnresolvedRecoveryKey は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function rememberUnresolvedRecoveryKey(recoveryKey) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!recoveryKey) {
        return;
    }

    unresolvedRecoveryKeys.add(recoveryKey);
    saveUnresolvedRecoveryKeys();
}

/**
 * forgetUnresolvedRecoveryKey は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function forgetUnresolvedRecoveryKey(recoveryKey) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!recoveryKey) {
        return;
    }

    unresolvedRecoveryKeys.delete(recoveryKey);
    saveUnresolvedRecoveryKeys();
}

/**
 * hasUnresolvedRecoveryKey は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function hasUnresolvedRecoveryKey(recoveryKey) {
    return recoveryKey !== '' && unresolvedRecoveryKeys.has(recoveryKey);
}

/**
 * notifyAdminSystemErrorChanged は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function notifyAdminSystemErrorChanged(type, detail = {}) {
    const eventDetail = { ...detail, type };
    window.dispatchEvent(new CustomEvent(`admin:${type}`, { detail: eventDetail }));

    // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
    try {
        const channel = new BroadcastChannel(systemErrorBroadcastChannel);
        channel.postMessage(eventDetail);
        channel.close();
    // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
    } catch {
        // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
        try {
            localStorage.setItem('tabi:last-system-error-event', JSON.stringify({
                ...eventDetail,
                notifiedAt: Date.now(),
            }));
        // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
        } catch {
            /* 通知だけの失敗なので、エラー登録や解消処理そのものは止めません。 */
        }
    }
}

/**
 * notifyAdminSystemErrorSaved は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function notifyAdminSystemErrorSaved(detail = {}) {
    notifyAdminSystemErrorChanged('system_error_created', detail);
}

/**
 * notifyAdminSystemErrorResolved は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function notifyAdminSystemErrorResolved(detail = {}) {
    notifyAdminSystemErrorChanged('system_error_resolved', detail);
}

/**
 * stripUrlSecrets は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function stripUrlSecrets(value) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!value || typeof value !== 'string') {
        return '';
    }

    // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
    try {
        const url = new URL(value, window.location.origin);
        const safeParams = new URLSearchParams();
        [...url.searchParams.entries()]
            // 条件に合うデータだけを残して、画面に出す内容を絞り込みます。
            .filter(([key]) => {
                const normalizedKey = key.trim();
                return !removableQueryKeys.has(normalizedKey) && !sensitiveQueryKeys.has(normalizedKey.toLowerCase());
            })
            .sort(([left], [right]) => left.localeCompare(right))
            .forEach(([key, entryValue]) => safeParams.append(key, entryValue));
        const query = safeParams.toString();

        return `${url.origin}${url.pathname.replace(/\/+$/, '')}${query ? `?${query}` : ''}`;
    // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
    } catch {
        return value.replace(/[?#].*$/, '').replace(/\/+$/, '');
    }
}

/**
 * normalizeRequestPath は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function normalizeRequestPath(value) {
    const sanitized = stripUrlSecrets(value);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!sanitized) {
        return '';
    }

    // API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
    try {
        const url = new URL(sanitized, window.location.origin);
        const path = `/${url.pathname.replace(/^\/+/, '').replace(/\/+$/, '')}`;
        return `${path}${url.search || ''}`;
    // エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
    } catch {
        return `/${sanitized.replace(/[?#].*$/, '').replace(/^\/+/, '')}`;
    }
}

/**
 * readFetchMethod は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function readFetchMethod(args) {
    const init = args[1] || {};

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (init.method) {
        return String(init.method).toUpperCase();
    }

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (typeof args[0] === 'object' && args[0]?.method) {
        return String(args[0].method).toUpperCase();
    }

    return 'GET';
}

/**
 * buildFingerprint は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function buildFingerprint(payload) {
    return [
        payload.errorCode || 'UNKNOWN',
        payload.pagePath || '',
        payload.source || '',
        payload.requestUrl || '',
        String(payload.message || '').slice(0, 120),
    ].join('|');
}

/**
 * buildRecoveryKey は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function buildRecoveryKey(payload) {
    /* 自動解消用の安定キーです。HTTPステータスやエラーメッセージは、失敗時と成功時で変わるため含めません。 */
    return [
        payload.source || 'frontend',
        payload.requestMethod || 'GET',
        normalizeRequestPath(payload.requestUrl || ''),
        payload.pagePath || '',
        payload.errorCode || 'API_HTTP_ERROR',
    ].join('|');
}

/**
 * shouldSuppress は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function shouldSuppress(fingerprint) {
    const now = Date.now();
    const lastSentAt = recentFingerprints.get(fingerprint) || 0;

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (now - lastSentAt < suppressMs) {
        return true;
    }

    recentFingerprints.set(fingerprint, now);
    return false;
}

/**
 * isIgnoredError は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function isIgnoredError(error) {
    const name = error?.name || '';
    const message = String(error?.message || error || '');

    return (
        name === 'AbortError' ||
        /abort|cancel|navigation|offline/i.test(message)
    );
}

/**
 * isSystemErrorInternalEndpoint は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function isSystemErrorInternalEndpoint(requestUrl) {
    return (
        requestUrl.includes('/api/SystemErrors/Report.php') ||
        requestUrl.includes('/api/SystemErrors/Resolve.php')
    );
}

/**
 * shouldTrackApiRequest は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function shouldTrackApiRequest(requestUrl) {
    return (
        requestUrl.includes('/api/') &&
        !isSystemErrorInternalEndpoint(requestUrl) &&
        !requestUrl.includes('/api/system/status.php')
    );
}

export function reportSystemError(payload = {}) {
    const pagePath = payload.pagePath || window.location.pathname;
    const requestUrl = stripUrlSecrets(payload.requestUrl || '');
    const requestMethod = String(payload.requestMethod || 'GET').toUpperCase();
    const sanitizedPayload = {
        errorType: payload.errorType || 'FRONTEND_ERROR',
        errorCode: payload.errorCode || 'FRONTEND_ERROR',
        message: String(payload.message || 'Frontend error').slice(0, 500),
        source: payload.source || 'frontend',
        component: payload.component || '',
        pagePath,
        requestUrl,
        requestMethod,
        recoveryKey: payload.recoveryKey || buildRecoveryKey({
            ...payload,
            source: payload.source || 'frontend',
            pagePath,
            requestUrl,
            requestMethod,
        }),
        httpStatus: Number.isFinite(Number(payload.httpStatus)) ? Number(payload.httpStatus) : null,
        stack: String(payload.stack || '').slice(0, 2000),
        userAgent: navigator.userAgent,
    };

    sanitizedPayload.fingerprint = payload.fingerprint || buildFingerprint(sanitizedPayload);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (shouldSuppress(sanitizedPayload.fingerprint)) {
        return;
    }

    // バックエンド API へ通信し、画面で使うデータの取得や保存を依頼します。
    fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedPayload),
    })
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        .then((response) => response.json().catch(() => null))
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        .then((data) => {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (data?.success) {
                notifyAdminSystemErrorSaved({
                    error_id: data.error_id || null,
                    errorCode: sanitizedPayload.errorCode,
                    recoveryKey: sanitizedPayload.recoveryKey,
                    pagePath: sanitizedPayload.pagePath,
                });
            }
        })
        .catch(() => {});
}

/**
 * resolveSystemError は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function resolveSystemError(payload = {}) {
    const pagePath = payload.pagePath || window.location.pathname;
    const requestUrl = stripUrlSecrets(payload.requestUrl || '');
    const requestMethod = String(payload.requestMethod || 'GET').toUpperCase();
    const sanitizedPayload = {
        fingerprint: payload.fingerprint || '',
        recoveryKey: payload.recoveryKey || buildRecoveryKey({
            source: 'frontend',
            requestMethod,
            requestUrl,
            pagePath,
            errorCode: 'API_HTTP_ERROR',
        }),
        errorCode: payload.errorCode || 'API_HTTP_ERROR',
        source: payload.source || 'frontend',
        requestMethod,
        pagePath,
        requestUrl,
        httpStatus: Number.isFinite(Number(payload.httpStatus)) ? Number(payload.httpStatus) : null,
    };

    /* APIが成功した直後に、同じAPIで過去に登録された未対応エラーがないかサーバーへ確認します。 */
    fetch(resolveEndpoint, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedPayload),
    })
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        .then((response) => response.json().catch(() => null))
        // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
        .then((data) => {
            const resolvedCount = Number(data?.resolvedCount ?? data?.resolved_count ?? 0);
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (data?.success && resolvedCount > 0) {
                forgetUnresolvedRecoveryKey(sanitizedPayload.recoveryKey);
                notifyAdminSystemErrorResolved({
                    resolvedCount,
                    recoveryKey: sanitizedPayload.recoveryKey,
                    pagePath: sanitizedPayload.pagePath,
                    requestUrl: sanitizedPayload.requestUrl,
                });
            }
        })
        .catch(() => {});
}

export function installSystemErrorListeners() {
    const originalFetch = window.fetch.bind(window);

    loadUnresolvedRecoveryKeys();

    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const requestMethod = readFetchMethod(args);
        const pagePath = window.location.pathname;
        const recoveryKey = buildRecoveryKey({
            source: 'frontend',
            requestMethod,
            requestUrl,
            pagePath,
            errorCode: 'API_HTTP_ERROR',
        });

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (!isSystemErrorInternalEndpoint(requestUrl) && !requestUrl.includes('/api/system/status.php') && response.status === 503) {
            const data = await response.clone().json().catch(() => null);
            const maintenanceCode = data?.status || data?.code || data?.reason;

            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (isMaintenanceCode(maintenanceCode) && !isAdminPath() && !isMaintenancePath()) {
                saveReturnPath();
                saveMaintenanceReason(maintenanceCode);
                window.location.assign(`${import.meta.env.BASE_URL}maintenance`);
                return response;
            }
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (shouldTrackApiRequest(requestUrl) && response.status >= 500 && response.status !== 503) {
            /* API失敗時は、あとで同じAPIが成功したか判定できるよう recoveryKey も保存します。 */
            const failurePayload = {
                errorType: 'API_ERROR',
                errorCode: 'API_HTTP_ERROR',
                message: `API request failed with HTTP ${response.status}`,
                source: 'frontend',
                requestMethod,
                requestUrl,
                recoveryKey,
                httpStatus: response.status,
                pagePath,
            };
            failurePayload.fingerprint = buildFingerprint({
                ...failurePayload,
                requestUrl: stripUrlSecrets(requestUrl),
            });
            rememberUnresolvedRecoveryKey(recoveryKey);
            reportSystemError(failurePayload);
        } else if (shouldTrackApiRequest(requestUrl) && response.ok && hasUnresolvedRecoveryKey(recoveryKey)) {
            /*
             * 以前このAPIで失敗を記録した場合だけ、解決APIを呼びます。
             * すべての成功fetchで毎回問い合わせると、管理画面の一覧取得など無関係な通信でも
             * 解決処理が走ってしまうため、request_url から作った recoveryKey を条件にしています。
             */
            resolveSystemError({
                recoveryKey,
                requestUrl,
                requestMethod,
                pagePath,
                httpStatus: response.status,
            });
        }

        return response;
    };

    window.addEventListener('error', (event) => {
        const target = event.target;
        const isResourceError = target && target !== window;

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (isResourceError) {
            // ここで条件を確認し、状況に合う処理だけを実行します。
            if (target.tagName === 'IMG') {
                return;
            }

            reportSystemError({
                errorType: 'RESOURCE_ERROR',
                errorCode: 'RESOURCE_LOAD_FAILED',
                message: 'Resource loading failed',
                source: target.tagName ? `${target.tagName.toLowerCase()} resource` : 'resource',
                requestUrl: target.currentSrc || target.src || target.href || '',
            });
            return;
        }

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (isIgnoredError(event.error)) {
            return;
        }

        reportSystemError({
            errorType: 'JAVASCRIPT_ERROR',
            errorCode: 'UNHANDLED_JAVASCRIPT_ERROR',
            message: event.message || 'Unhandled JavaScript error',
            source: 'window.error',
            stack: event.error?.stack || '',
        });
    }, true);

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (isIgnoredError(reason)) {
            return;
        }

        reportSystemError({
            errorType: 'JAVASCRIPT_ERROR',
            errorCode: 'UNHANDLED_PROMISE_REJECTION',
            message: reason?.message || String(reason || 'Unhandled promise rejection'),
            source: 'window.unhandledrejection',
            stack: reason?.stack || '',
        });
    });
}
