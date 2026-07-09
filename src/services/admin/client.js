const ADMIN_API_BASE = '/TABI/api/Admin/index.php';

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
