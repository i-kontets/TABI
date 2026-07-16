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

function loadUnresolvedRecoveryKeys() {
    try {
        const savedKeys = JSON.parse(sessionStorage.getItem(unresolvedRecoveryStorageKey) || '[]');
        if (Array.isArray(savedKeys)) {
            savedKeys.forEach((key) => {
                if (typeof key === 'string' && key !== '') {
                    unresolvedRecoveryKeys.add(key);
                }
            });
        }
    } catch {
        /* 保存済みデータが壊れていても、エラー監視自体は止めないようにします。 */
    }
}

function saveUnresolvedRecoveryKeys() {
    try {
        sessionStorage.setItem(unresolvedRecoveryStorageKey, JSON.stringify([...unresolvedRecoveryKeys]));
    } catch {
        /* sessionStorage が使えない環境でも、画面を開いている間の Set だけで動かします。 */
    }
}

function rememberUnresolvedRecoveryKey(recoveryKey) {
    if (!recoveryKey) {
        return;
    }

    unresolvedRecoveryKeys.add(recoveryKey);
    saveUnresolvedRecoveryKeys();
}

function forgetUnresolvedRecoveryKey(recoveryKey) {
    if (!recoveryKey) {
        return;
    }

    unresolvedRecoveryKeys.delete(recoveryKey);
    saveUnresolvedRecoveryKeys();
}

function hasUnresolvedRecoveryKey(recoveryKey) {
    return recoveryKey !== '' && unresolvedRecoveryKeys.has(recoveryKey);
}

function notifyAdminSystemErrorChanged(type, detail = {}) {
    const eventDetail = { ...detail, type };
    window.dispatchEvent(new CustomEvent(`admin:${type}`, { detail: eventDetail }));

    try {
        const channel = new BroadcastChannel(systemErrorBroadcastChannel);
        channel.postMessage(eventDetail);
        channel.close();
    } catch {
        try {
            localStorage.setItem('tabi:last-system-error-event', JSON.stringify({
                ...eventDetail,
                notifiedAt: Date.now(),
            }));
        } catch {
            /* 通知だけの失敗なので、エラー登録や解消処理そのものは止めません。 */
        }
    }
}

function notifyAdminSystemErrorSaved(detail = {}) {
    notifyAdminSystemErrorChanged('system_error_created', detail);
}

function notifyAdminSystemErrorResolved(detail = {}) {
    notifyAdminSystemErrorChanged('system_error_resolved', detail);
}

function stripUrlSecrets(value) {
    if (!value || typeof value !== 'string') {
        return '';
    }

    try {
        const url = new URL(value, window.location.origin);
        const safeParams = new URLSearchParams();
        [...url.searchParams.entries()]
            .filter(([key]) => {
                const normalizedKey = key.trim();
                return !removableQueryKeys.has(normalizedKey) && !sensitiveQueryKeys.has(normalizedKey.toLowerCase());
            })
            .sort(([left], [right]) => left.localeCompare(right))
            .forEach(([key, entryValue]) => safeParams.append(key, entryValue));
        const query = safeParams.toString();

        return `${url.origin}${url.pathname.replace(/\/+$/, '')}${query ? `?${query}` : ''}`;
    } catch {
        return value.replace(/[?#].*$/, '').replace(/\/+$/, '');
    }
}

function normalizeRequestPath(value) {
    const sanitized = stripUrlSecrets(value);

    if (!sanitized) {
        return '';
    }

    try {
        const url = new URL(sanitized, window.location.origin);
        const path = `/${url.pathname.replace(/^\/+/, '').replace(/\/+$/, '')}`;
        return `${path}${url.search || ''}`;
    } catch {
        return `/${sanitized.replace(/[?#].*$/, '').replace(/^\/+/, '')}`;
    }
}

function readFetchMethod(args) {
    const init = args[1] || {};

    if (init.method) {
        return String(init.method).toUpperCase();
    }

    if (typeof args[0] === 'object' && args[0]?.method) {
        return String(args[0].method).toUpperCase();
    }

    return 'GET';
}

function buildFingerprint(payload) {
    return [
        payload.errorCode || 'UNKNOWN',
        payload.pagePath || '',
        payload.source || '',
        payload.requestUrl || '',
        String(payload.message || '').slice(0, 120),
    ].join('|');
}

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

function shouldSuppress(fingerprint) {
    const now = Date.now();
    const lastSentAt = recentFingerprints.get(fingerprint) || 0;

    if (now - lastSentAt < suppressMs) {
        return true;
    }

    recentFingerprints.set(fingerprint, now);
    return false;
}

function isIgnoredError(error) {
    const name = error?.name || '';
    const message = String(error?.message || error || '');

    return (
        name === 'AbortError' ||
        /abort|cancel|navigation|offline/i.test(message)
    );
}

function isSystemErrorInternalEndpoint(requestUrl) {
    return (
        requestUrl.includes('/api/SystemErrors/Report.php') ||
        requestUrl.includes('/api/SystemErrors/Resolve.php')
    );
}

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

    if (shouldSuppress(sanitizedPayload.fingerprint)) {
        return;
    }

    fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedPayload),
    })
        .then((response) => response.json().catch(() => null))
        .then((data) => {
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
        .then((response) => response.json().catch(() => null))
        .then((data) => {
            const resolvedCount = Number(data?.resolvedCount ?? data?.resolved_count ?? 0);
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

        if (!isSystemErrorInternalEndpoint(requestUrl) && !requestUrl.includes('/api/system/status.php') && response.status === 503) {
            const data = await response.clone().json().catch(() => null);
            const maintenanceCode = data?.status || data?.code || data?.reason;

            if (isMaintenanceCode(maintenanceCode) && !isAdminPath() && !isMaintenancePath()) {
                saveReturnPath();
                saveMaintenanceReason(maintenanceCode);
                window.location.assign(`${import.meta.env.BASE_URL}maintenance`);
                return response;
            }
        }

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

        if (isResourceError) {
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
