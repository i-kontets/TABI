import { adminRequest } from './client';

export function fetchManagers() {
    return adminRequest('managers').then((result) => result.items ?? result);
}

export function createManager(data) {
    return adminRequest('managers', {
        method: 'POST',
        body: data,
    });
}

export function toggleManagerStatus(managerId) {
    return adminRequest('managers', {
        method: 'PATCH',
        params: { id: managerId },
    });
}
