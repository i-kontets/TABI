import { mockNotices } from './mockData';
import { request, paginate } from './client';

// お知らせ一覧
export function fetchNotices({ status = '', page = 1 } = {}) {
    return request(() => {
        let list = mockNotices;
        if (status) list = list.filter((n) => n.status === status);
        return paginate(list, { page });
    });
}

// お知らせ詳細
export function fetchNotice(noticeId) {
    return request(() => mockNotices.find((n) => n.id === noticeId) || null);
}

// 作成
export function createNotice(data) {
    return request(() => {
        const notice = { id: `n${Date.now()}`, readRate: 0, status: '公開中', ...data };
        mockNotices.unshift(notice);
        return notice;
    });
}

// 更新
export function updateNotice(noticeId, data) {
    return request(() => {
        const n = mockNotices.find((x) => x.id === noticeId);
        if (n) Object.assign(n, data);
        return n;
    });
}

// 削除
export function deleteNotice(noticeId) {
    return request(() => {
        const idx = mockNotices.findIndex((x) => x.id === noticeId);
        if (idx >= 0) mockNotices.splice(idx, 1);
        return true;
    });
}
