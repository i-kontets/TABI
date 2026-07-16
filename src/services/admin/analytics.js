import { fetchResource } from './client';

export function fetchAnalytics() {
    return fetchResource('analytics');
}

export function fetchActivities() {
    return fetchResource('activities');
}

export function fetchActivityPage({ page = 1 } = {}) {
    return fetchResource('activities-page', { page });
}

export function fetchPendingSupportItems() {
    return fetchResource('support-pending');
}
