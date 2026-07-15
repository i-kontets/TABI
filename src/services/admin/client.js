const ADMIN_API_BASE = '/TABI/api/Admin/index.php';
const ADMIN_DATABASE_UNAVAILABLE_CODES = new Set([
    'OUTSIDE_SERVICE_HOURS',
    'SCHEDULED_DB_STOP',
    'DATABASE_UNAVAILABLE',
]);

function buildUrl(resource, params = {}) {
    const search = new URLSearchParams();
    search.set('resource', resource);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, value);
        }
    });
    return `${ADMIN_API_BASE}?${search.toString()}`;
}

async function parseResponse(response) {
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
        const unavailableCode = data?.status || data?.code || data?.reason;

        if (ADMIN_DATABASE_UNAVAILABLE_CODES.has(unavailableCode)) {
            window.dispatchEvent(new CustomEvent('admin:database_unavailable', {
                detail: {
                    available: false,
                    reason: unavailableCode,
                    now: data?.checkedAt || data?.now || null,
                    nextOpenAt: data?.nextScheduledOpenAt || data?.nextOpenAt || null,
                    nextCloseAt: data?.nextScheduledCloseAt || data?.nextCloseAt || null,
                    timezone: data?.timezone || 'Asia/Tokyo',
                },
            }));
        }

        throw new Error(data?.message || '管理APIの取得に失敗しました。');
    }
    return data;
}

export function fetchResource(resource, params = {}) {
    return fetch(buildUrl(resource, params), { credentials: 'include' }).then(parseResponse);
}

export function fetchResourceItem(resource, id) {
    return fetchResource(resource, { id });
}

export function createResource(resource, body = {}) {
    return fetch(buildUrl(resource), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(parseResponse);
}

export function updateResource(resource, id, body = {}, params = {}) {
    return fetch(buildUrl(resource, { id, ...params }), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(parseResponse);
}

export function deleteResource(resource, id) {
    return fetch(buildUrl(resource, { id }), {
        method: 'DELETE',
        credentials: 'include',
    }).then(parseResponse);
}
