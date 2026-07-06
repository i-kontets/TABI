import { adminRequest } from './client';

// グループ一覧を取得します。
// query と status を渡して、一覧を検索・絞り込みできるようにします。
export function fetchGroups({ query = '', status = '', page = 1 } = {}) {
    return adminRequest('groups', { params: { query, status, page } });
}

// グループ ID を指定して、単体のグループ詳細を取得します。
export function fetchGroup(groupId) {
    return adminRequest('groups', { params: { id: groupId } });
}
