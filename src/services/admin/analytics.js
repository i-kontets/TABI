import { adminRequest } from './client';

export function fetchAnalytics() {
    return adminRequest('analytics');
}

export function fetchActivities() {
    return adminRequest('activities');
}
