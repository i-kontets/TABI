import { fetchResource } from './client';

export function fetchLogs({ query = '', page = 1 } = {}) {
    return fetchResource('logs', { query, page });
}
