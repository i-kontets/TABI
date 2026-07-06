import { adminRequest } from './client';

export function fetchLogs({ query = '', page = 1 } = {}) {
    return adminRequest('logs', { params: { query, page } });
}
