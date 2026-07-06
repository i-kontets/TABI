import { mockGroups } from './mockData';
import { request, paginate } from './client';

// 旅行グループ一覧
export function fetchGroups({ query = '', status = '', page = 1 } = {}) {
    return request(() => {
        let list = mockGroups;
        if (query) list = list.filter((g) => g.name.includes(query));
        if (status) list = list.filter((g) => g.status === status);
        return paginate(list, { page });
    });
}

// グループ詳細
export function fetchGroup(groupId) {
    return request(() => mockGroups.find((g) => g.id === groupId) || null);
}
