import { adminRequest } from './client';

// 管理操作ログを一覧取得します。
// query と page を渡して検索とページングに対応します。
export function fetchLogs({ query = '', page = 1 } = {}) {
    return adminRequest('logs', { params: { query, page } });
}
