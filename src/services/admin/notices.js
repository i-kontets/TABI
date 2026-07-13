import { createResource, deleteResource, fetchResource, fetchResourceItem, updateResource } from './client';

export function fetchNotices({ status = '', page = 1 } = {}) {
    return fetchResource('notices', { status, page });
}

export function fetchNotice(noticeId) {
    return fetchResourceItem('notices', noticeId);
}

export function createNotice(data) {
    return createResource('notices', data);
}

export function updateNotice(noticeId, data) {
    return updateResource('notices', noticeId, data);
}

export function deleteNotice(noticeId) {
    return deleteResource('notices', noticeId);
}
