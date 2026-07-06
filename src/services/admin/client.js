// 管理画面の API はこの 1 つの PHP エンドポイントに集約されています。
// BASE_URL を使うことで、デプロイ先のサブパスが変わっても追従できます。
const ADMIN_API_BASE = `${import.meta.env.BASE_URL}api/Admin/index.php`;

// resource 名とクエリパラメータから、管理 API の URL を組み立てます。
// params は空文字や null を除外して付与します。
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

// 管理 API を呼ぶための共通リクエスト関数です。
// GET 以外では JSON ボディを送り、失敗時は API が返した message を優先して例外化します。
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
