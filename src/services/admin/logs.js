import { mockLogs } from './mockData';
import { request, paginate } from './client';

// 操作ログ一覧
export function fetchLogs({ query = '', page = 1 } = {}) {
    return request(() => {
        let list = mockLogs;
        if (query) list = list.filter((l) => l.action.includes(query) || l.manager.includes(query));
        return paginate(list, { page, perPage: 10 });
    });
}
