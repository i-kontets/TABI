import { fetchResource, fetchResourceItem, updateResource } from './client';

export function fetchUsers({ query = '', status = '', page = 1, sort = '' } = {}) {
    return fetchResource('users', { query, status, page, sort });
}

export function fetchUser(userId) {
    return fetchResourceItem('users', userId);
}

export function suspendUser(userId) {
    return updateResource('users', userId, {}, { action: 'suspend' });
}

export function deleteUser(userId) {
    return updateResource('users', userId, {}, { action: 'delete' });
}
