/**
 * 管理画面から管理 API を呼び出すための共通クライアントです。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理画面から渡された検索条件や入力内容、API から返った JSON を主に扱います。
 */
/**
 * 管理者画面から管理者APIを呼び出すための共通クライアントです。
 *
 * 画面ごとにfetchの書き方がばらばらにならないよう、
 * URL生成、レスポンス確認、DB停止時のイベント通知をここに集約しています。
 */
const ADMIN_API_BASE = '/TABI/api/Admin/index.php';
const ADMIN_DATABASE_UNAVAILABLE_CODES = new Set([
    'OUTSIDE_SERVICE_HOURS',
    'SCHEDULED_DB_STOP',
    'DATABASE_UNAVAILABLE',
]);

/**
 * buildUrl は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function buildUrl(resource, params = {}) {
    // 管理APIは resource パラメータで users / groups / notices などの対象を切り替えます。
    const search = new URLSearchParams();
    search.set('resource', resource);
    Object.entries(params).forEach(([key, value]) => {
        // undefined や空文字はURLに含めず、必要な検索条件だけを送ります。
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, value);
        }
    });
    return `${ADMIN_API_BASE}?${search.toString()}`;
}

async function parseResponse(response) {
    // APIのJSONを読み取り、HTTPエラーまたは success=false の場合は例外として扱います。
    const data = await response.json().catch(() => null);
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!response.ok || data?.success === false) {
        const unavailableCode = data?.status || data?.code || data?.reason;

        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (ADMIN_DATABASE_UNAVAILABLE_CODES.has(unavailableCode)) {
            // DB停止系のエラーは、管理者画面全体へ通知して専用画面に切り替えます。
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
    // 一覧取得や詳細取得など、GETでデータを読むときに使います。
    return fetch(buildUrl(resource, params), { credentials: 'include' }).then(parseResponse);
}

export function fetchResourceItem(resource, id) {
    return fetchResource(resource, { id });
}

export function createResource(resource, body = {}) {
    // 新規作成系のAPIです。JSON本文をPOSTで送ります。
    return fetch(buildUrl(resource), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
    }).then(parseResponse);
}

export function updateResource(resource, id, body = {}, params = {}) {
    // 既存データの更新や状態変更に使うPATCH APIです。
    return fetch(buildUrl(resource, { id, ...params }), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
    }).then(parseResponse);
}

export function deleteResource(resource, id) {
    // 管理画面上の削除操作です。API側では論理削除として扱うものがあります。
    return fetch(buildUrl(resource, { id }), {
        method: 'DELETE',
        credentials: 'include',
    // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
    }).then(parseResponse);
}
