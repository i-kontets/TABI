/**
 * API接続の差し替えポイント。
 * 現在はモックデータをPromiseで返している。
 * 実APIに切り替える際は、各サービス関数内の request(...) を
 * fetch / axios 呼び出しに置き換えるだけでよい。
 */

const MOCK_DELAY_MS = 150;

// モック用:少し遅延させてAPIらしく振る舞う
export function request(resolver) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(resolver()), MOCK_DELAY_MS);
    });
}

// 一覧系の共通処理:検索・フィルター・ページング
export function paginate(list, { page = 1, perPage = 20 } = {}) {
    const totalPages = Math.max(1, Math.ceil(list.length / perPage));
    const p = Math.min(Math.max(1, page), totalPages);
    return {
        items: list.slice((p - 1) * perPage, p * perPage),
        page: p,
        totalPages,
        total: list.length,
    };
}
