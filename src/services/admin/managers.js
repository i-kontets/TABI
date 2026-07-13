import { createResource, fetchResource, updateResource } from './client';

export function fetchManagers() {
    return fetchResource('managers');
}

export function createManager(data) {
    return createResource('managers', data);
}

export function toggleManagerStatus(managerId) {
    return updateResource('managers', managerId, {}, { action: 'toggle-status' });
}
