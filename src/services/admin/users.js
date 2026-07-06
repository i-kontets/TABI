import { mockUsers } from './mockData';
import { request, paginate } from './client';

// ユーザー一覧(検索・ステータス絞り込み・ページング)
export function fetchUsers({ query = '', status = '', page = 1 } = {}) {
    return request(() => {
        let list = mockUsers;
        if (query) {
            const q = query.toLowerCase();
            list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
        }
        if (status) list = list.filter((u) => u.status === status);
        return paginate(list, { page });
    });
}

// ユーザー詳細
export function fetchUser(userId) {
    return request(() => mockUsers.find((u) => u.id === Number(userId)) || null);
}

// 利用停止 / 復旧
export function suspendUser(userId) {
    return request(() => {
        const u = mockUsers.find((x) => x.id === Number(userId));
        if (u) u.status = u.status === '停止中' ? '通常' : '停止中';
        return u;
    });
}

// 削除(退会処理)
export function deleteUser(userId) {
    return request(() => {
        const u = mockUsers.find((x) => x.id === Number(userId));
        if (u) u.status = '退会済み';
        return u;
    });
}
