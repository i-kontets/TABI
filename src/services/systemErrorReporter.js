const endpoint = `${import.meta.env.BASE_URL}api/SystemErrors/Report.php`;
const recentFingerprints = new Map();
const suppressMs = 60 * 1000;

function stripUrlSecrets(value) {
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
    return [
        payload.errorCode || 'UNKNOWN',
        payload.pagePath || '',
        payload.source || '',
        payload.requestUrl || '',
        String(payload.message || '').slice(0, 120),
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

export function reportSystemError(payload = {}) {
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

    fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedPayload),
    }).catch(() => {});
}

export function installSystemErrorListeners() {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const isReportEndpoint = requestUrl.includes('/api/SystemErrors/Report.php');

        if (!isReportEndpoint && response.status >= 500) {
            reportSystemError({
                errorType: 'API_ERROR',
                errorCode: 'API_HTTP_ERROR',
                message: `API request failed with HTTP ${response.status}`,
                source: 'fetch',
                requestUrl,
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
