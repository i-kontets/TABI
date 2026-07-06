const ADMIN_API_BASE = `${import.meta.env.BASE_URL}api/Admin/index.php`;

function buildUrl(resource, params = {}) {
    const url = new URL(ADMIN_API_BASE, window.location.origin);
    url.searchParams.set('resource', resource);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });

    return url;
}

export async function adminRequest(resource, { method = 'GET', params = {}, body } = {}) {
    const response = await fetch(buildUrl(resource, params), {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = data?.message || 'Admin API request failed.';
        throw new Error(message);
    }

    return data;
}
