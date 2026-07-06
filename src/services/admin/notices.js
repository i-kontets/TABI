import { adminRequest } from './client';

export function fetchNotices({ status = '', page = 1 } = {}) {
    return adminRequest('notices', { params: { status, page } });
}

export function fetchNotice(noticeId) {
    return adminRequest('notices', { params: { id: noticeId } });
}

export function createNotice(data) {
    return adminRequest('notices', {
        method: 'POST',
        body: data,
    });
}

export function updateNotice(noticeId, data) {
    return adminRequest('notices', {
        method: 'PATCH',
        params: { id: noticeId },
        body: data,
    });
}

export function deleteNotice(noticeId) {
    return adminRequest('notices', {
        method: 'DELETE',
        params: { id: noticeId },
    });
}
