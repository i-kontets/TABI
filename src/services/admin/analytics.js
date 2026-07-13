import { fetchResource } from './client';

export function fetchAnalytics() {
    return fetchResource('analytics');
}

export function fetchActivities() {
    return fetchResource('activities');
}

export function fetchPendingSupportItems() {
    return fetchResource('support-pending');
}
