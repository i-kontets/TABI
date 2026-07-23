/**
 * 管理画面の各ページが使う API 呼び出しを、機能ごとに分けてまとめています。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理画面から渡された検索条件や入力内容、API から返った JSON を主に扱います。
 */
import { fetchResource } from './client';

/**
 * normalizeSystemErrorResult は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function normalizeSystemErrorResult(result, fallbackLimit = 25) {
    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (Array.isArray(result)) {
        return {
            items: result,
            page: 1,
            totalPages: 1,
            total: result.length,
            limit: fallbackLimit,
            pagination: {
                currentPage: 1,
                perPage: fallbackLimit,
                totalItems: result.length,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false,
            },
        };
    }

    const items = Array.isArray(result?.items) ? result.items : [];

    return {
        items,
        page: result?.pagination?.currentPage ?? result?.page ?? 1,
        totalPages: result?.pagination?.totalPages ?? result?.totalPages ?? 1,
        total: result?.pagination?.totalItems ?? result?.total ?? items.length,
        limit: result?.pagination?.perPage ?? result?.limit ?? fallbackLimit,
        pagination: result?.pagination ?? {
            currentPage: result?.page ?? 1,
            perPage: result?.limit ?? fallbackLimit,
            totalItems: result?.total ?? items.length,
            totalPages: result?.totalPages ?? 1,
            hasPreviousPage: (result?.page ?? 1) > 1,
            hasNextPage: (result?.page ?? 1) < (result?.totalPages ?? 1),
        },
    };
}

export function fetchSystemErrors(params = {}) {
    // システムエラー一覧はDB側でページングするため、pageやlimitをAPIへそのまま渡します。
    const fallbackLimit = Number(params.limit) || 25;
    // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
    return fetchResource('system-errors', params).then((result) => normalizeSystemErrorResult(result, fallbackLimit));
}

export function fetchRecentSystemErrors() {
    // 設定ページの概要では、未対応の最新10件だけを取得します。
    return fetchSystemErrors({ page: 1, limit: 10, status: 'unresolved' }).then((result) => result.items);
}
