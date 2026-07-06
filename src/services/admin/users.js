import { adminRequest } from './client';

// ユーザー一覧を取得します。
// query と status を渡して、検索と状態絞り込みを行います。
export function fetchUsers({ query = '', status = '', page = 1 } = {}) {
    return adminRequest('users', { params: { query, status, page } });
}

// ユーザー ID を指定して、単体の詳細を取得します。
export function fetchUser(userId) {
    return adminRequest('users', { params: { id: userId } });
}

// ユーザーを停止状態にします。
export function suspendUser(userId) {
    return adminRequest('users', {
        method: 'PATCH',
        params: { id: userId, action: 'suspend' },
    });
}

// ユーザーを退会扱いとして削除します。
export function deleteUser(userId) {
    return adminRequest('users', {
        method: 'PATCH',
        params: { id: userId, action: 'delete' },
    });
}
