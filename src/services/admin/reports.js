import { fetchResource, fetchResourceItem, updateResource } from './client';

export function fetchReports({ status = '', page = 1 } = {}) {
    return fetchResource('reports', { status, page });
}

export function fetchReportCounts() {
    return fetchResource('reports-counts');
}

export function fetchReport(reportId) {
    return fetchResourceItem('reports', reportId);
}

export function updateReport(reportId, { status, note }) {
    return updateResource('reports', reportId, { status, note });
}
