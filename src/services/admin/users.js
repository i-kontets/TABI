import { adminRequest } from './client';

export function fetchUsers({ query = '', status = '', page = 1 } = {}) {
    return adminRequest('users', { params: { query, status, page } });
}

export function fetchUser(userId) {
    return adminRequest('users', { params: { id: userId } });
}

export function suspendUser(userId) {
    return adminRequest('users', {
        method: 'PATCH',
        params: { id: userId, action: 'suspend' },
    });
}

export function deleteUser(userId) {
    return adminRequest('users', {
        method: 'PATCH',
        params: { id: userId, action: 'delete' },
    });
}
