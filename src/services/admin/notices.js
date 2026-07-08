import { adminRequest } from './client';

// お知らせ一覧を取得します。
// status と page を指定して、公開状態の絞り込みとページングを行います。
export function fetchNotices({ status = '', page = 1 } = {}) {
    return adminRequest('notices', { params: { status, page } });
}

// お知らせ ID を指定して、単体の詳細を取得します。
export function fetchNotice(noticeId) {
    return adminRequest('notices', { params: { id: noticeId } });
}

// お知らせを新規作成します。
export function createNotice(data) {
    return adminRequest('notices', {
        method: 'POST',
        body: data,
    });
}

// 既存のお知らせを更新します。
export function updateNotice(noticeId, data) {
    return adminRequest('notices', {
        method: 'PATCH',
        params: { id: noticeId },
        body: data,
    });
}

// お知らせを論理削除します。
export function deleteNotice(noticeId) {
    return adminRequest('notices', {
        method: 'DELETE',
        params: { id: noticeId },
    });
}
