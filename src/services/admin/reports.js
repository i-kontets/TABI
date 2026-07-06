import { adminRequest } from './client';

export function fetchReports({ status = '', page = 1 } = {}) {
    return adminRequest('reports', { params: { status, page } });
}

export function fetchReportCounts() {
    return adminRequest('reports-counts');
}

export function fetchReport(reportId) {
    return adminRequest('reports', { params: { id: reportId } });
}

export function updateReport(reportId, { status, note }) {
    return adminRequest('reports', {
        method: 'PATCH',
        params: { id: reportId },
        body: { status, note },
    });
}
