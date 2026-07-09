import { fetchResource, fetchResourceItem, updateResource } from './client';

export function fetchGroups({ query = '', status = '', page = 1 } = {}) {
    return fetchResource('groups', { query, status, page });
}

export function fetchGroup(groupId) {
    return fetchResourceItem('groups', groupId);
}

export function deleteGroup(groupId) {
    return updateResource('groups', groupId, {}, { action: 'delete' });
}
