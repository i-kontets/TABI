import { adminRequest } from './client';

export function fetchGroups({ query = '', status = '', page = 1 } = {}) {
    return adminRequest('groups', { params: { query, status, page } });
}

export function fetchGroup(groupId) {
    return adminRequest('groups', { params: { id: groupId } });
}
