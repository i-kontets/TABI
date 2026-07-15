import { fetchResource } from './client';

export function fetchSystemErrors() {
    return fetchResource('system-errors').then((result) => {
        if (Array.isArray(result)) {
            return result;
        }

        return Array.isArray(result?.items) ? result.items : [];
    });
}
