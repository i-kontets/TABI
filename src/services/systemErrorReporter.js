import {
    isAdminPath,
    isMaintenanceCode,
    isMaintenancePath,
    saveMaintenanceReason,
    saveReturnPath,
} from './serviceStatus';

/**
 * フロントエンド側で起きたエラーを管理者画面へ届けるための共通処理です。
 *
 * fetch の失敗、JavaScript の例外、画像以外のリソース読み込み失敗を拾い、
 * api/SystemErrors/Report.php へ送信します。
 * DB停止を表す503だけは、エラー記録ではなくメンテナンス画面への切り替えに使います。
 */
const endpoint = `${import.meta.env.BASE_URL}api/SystemErrors/Report.php`;
const resolveEndpoint = `${import.meta.env.BASE_URL}api/SystemErrors/Resolve.php`;
const recentFingerprints = new Map();
const failedFetchFingerprints = new Map();
const suppressMs = 60 * 1000;
const systemErrorBroadcastChannel = 'tabi-admin-system-errors';

function notifyAdminSystemErrorChanged(type, detail = {}) {
    // 同じブラウザ内で管理画面を別タブ表示している場合も、保存直後に再取得できるよう通知します。
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
            // 通知に失敗しても、エラー保存そのものは完了しているため何もしません。
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
    // URLにクエリ文字列やトークンが付いている可能性があるため、保存前にパス部分だけへ丸めます。
    if (!value || typeof value !== 'string') {
        return '';
    }

    try {
        const url = new URL(value, window.location.origin);
        return `${url.origin}${url.pathname}`;
    } catch {
        return value.replace(/[?#].*$/, '');
    }
}

function buildFingerprint(payload) {
    // 同じエラーを短時間に何度も送らないため、内容から簡易的な識別文字列を作ります。
    return [
        payload.errorCode || 'UNKNOWN',
        payload.pagePath || '',
        payload.source || '',
        payload.requestUrl || '',
        String(payload.message || '').slice(0, 120),
    ].join('|');
}

function buildFetchRequestKey(requestUrl, pagePath = window.location.pathname) {
    // 同じAPIが後で成功したかを判定するため、クエリを除いたURLと画面パスで失敗履歴を持ちます。
    return `${stripUrlSecrets(requestUrl)}|${pagePath || ''}`;
}

function shouldSuppress(fingerprint) {
    // 直近1分以内に同じエラーを送っていれば、DBへの重複記録を避けるため送信しません。
    const now = Date.now();
    const lastSentAt = recentFingerprints.get(fingerprint) || 0;

    if (now - lastSentAt < suppressMs) {
        return true;
    }

    recentFingerprints.set(fingerprint, now);
    return false;
}

function isIgnoredError(error) {
    // 画面遷移や通信中断など、ユーザー操作で自然に起きるエラーは記録対象から外します。
    const name = error?.name || '';
    const message = String(error?.message || error || '');

    return (
        name === 'AbortError' ||
        /abort|cancel|navigation|offline/i.test(message)
    );
}

export function reportSystemError(payload = {}) {
    // APIへ送る前に、文字数やURLを安全な形に整えます。
    const pagePath = payload.pagePath || window.location.pathname;
    const requestUrl = stripUrlSecrets(payload.requestUrl || '');
    const sanitizedPayload = {
        errorType: payload.errorType || 'FRONTEND_ERROR',
        errorCode: payload.errorCode || 'FRONTEND_ERROR',
        message: String(payload.message || 'Frontend error').slice(0, 500),
        source: payload.source || 'frontend',
        component: payload.component || '',
        pagePath,
        requestUrl,
        httpStatus: Number.isFinite(Number(payload.httpStatus)) ? Number(payload.httpStatus) : null,
        stack: String(payload.stack || '').slice(0, 2000),
        userAgent: navigator.userAgent,
    };

    sanitizedPayload.fingerprint = payload.fingerprint || buildFingerprint(sanitizedPayload);

    if (shouldSuppress(sanitizedPayload.fingerprint)) {
        return;
    }

    // keepalive を使うことで、ページ遷移中でもできるだけエラー送信を完了させます。
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
                    pagePath: sanitizedPayload.pagePath,
                });
            }
        })
        .catch(() => {});
}

function resolveSystemError(payload = {}) {
    const pagePath = payload.pagePath || window.location.pathname;
    const requestUrl = stripUrlSecrets(payload.requestUrl || '');
    const sanitizedPayload = {
        fingerprint: payload.fingerprint || '',
        pagePath,
        requestUrl,
        httpStatus: Number.isFinite(Number(payload.httpStatus)) ? Number(payload.httpStatus) : null,
    };

    if (!sanitizedPayload.fingerprint) {
        return;
    }

    // 成功時の解消通知は表示更新が目的なので、失敗しても元の画面操作は止めません。
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
            if (data?.success && Number(data.resolved_count) > 0) {
                notifyAdminSystemErrorResolved({
                    resolvedCount: Number(data.resolved_count),
                    pagePath: sanitizedPayload.pagePath,
                    requestUrl: sanitizedPayload.requestUrl,
                });
            }
        })
        .catch(() => {});
}

export function installSystemErrorListeners() {
    // window.fetch を包み込み、既存コードのfetch呼び出しを変更せずにAPIエラーを監視します。
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const isReportEndpoint = requestUrl.includes('/api/SystemErrors/Report.php');
        const isResolveEndpoint = requestUrl.includes('/api/SystemErrors/Resolve.php');
        const isStatusEndpoint = requestUrl.includes('/api/system/status.php');
        const requestKey = buildFetchRequestKey(requestUrl);

        if (!isReportEndpoint && !isResolveEndpoint && !isStatusEndpoint && response.status === 503) {
            const data = await response.clone().json().catch(() => null);
            const maintenanceCode = data?.status || data?.code || data?.reason;

            if (isMaintenanceCode(maintenanceCode) && !isAdminPath() && !isMaintenancePath()) {
                // DB停止を検知した場合は、元の戻り先と理由を保存してユーザー向け案内画面へ移動します。
                saveReturnPath();
                saveMaintenanceReason(maintenanceCode);
                window.location.assign(`${import.meta.env.BASE_URL}maintenance`);
                return response;
            }
        }

        if (!isReportEndpoint && !isResolveEndpoint && response.status >= 500 && response.status !== 503) {
            // 503以外のサーバーエラーは、管理者が後から確認できるようシステムエラーとして記録します。
            const failurePayload = {
                errorType: 'API_ERROR',
                errorCode: 'API_HTTP_ERROR',
                message: `API request failed with HTTP ${response.status}`,
                source: 'fetch',
                requestUrl,
                httpStatus: response.status,
                pagePath: window.location.pathname,
            };
            failurePayload.fingerprint = buildFingerprint({
                ...failurePayload,
                requestUrl: stripUrlSecrets(requestUrl),
            });
            failedFetchFingerprints.set(requestKey, failurePayload.fingerprint);
            reportSystemError(failurePayload);
        } else if (!isReportEndpoint && !isResolveEndpoint && response.ok && failedFetchFingerprints.has(requestKey)) {
            const fingerprint = failedFetchFingerprints.get(requestKey);
            failedFetchFingerprints.delete(requestKey);
            resolveSystemError({
                fingerprint,
                requestUrl,
                pagePath: window.location.pathname,
                httpStatus: response.status,
            });
        }

        return response;
    };

    window.addEventListener('error', (event) => {
        // JavaScript例外と、script/cssなどの読み込み失敗をここで拾います。
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
        // Promise の catch されなかった失敗も、画面上では気づきにくいため記録します。
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
