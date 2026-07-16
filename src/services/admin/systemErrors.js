import { fetchResource } from './client';

function normalizeSystemErrorResult(result, fallbackLimit = 25) {
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
    return fetchResource('system-errors', params).then((result) => normalizeSystemErrorResult(result, fallbackLimit));
}

export function fetchRecentSystemErrors() {
    // 設定ページの概要では、未対応の最新10件だけを取得します。
    return fetchSystemErrors({ page: 1, limit: 10, status: 'unresolved' }).then((result) => result.items);
}
