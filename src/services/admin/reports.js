import { adminRequest } from './client';

// 通報一覧を取得します。
// status と page を渡して、対応状況の絞り込みとページングを行います。
export function fetchReports({ status = '', page = 1 } = {}) {
    return adminRequest('reports', { params: { status, page } });
}

// 通報状態の件数を取得します。
export function fetchReportCounts() {
    return adminRequest('reports-counts');
}

// 通報 ID を指定して、単体の詳細を取得します。
export function fetchReport(reportId) {
    return adminRequest('reports', { params: { id: reportId } });
}

// 通報の状態や管理メモを更新します。
export function updateReport(reportId, { status, note }) {
    return adminRequest('reports', {
        method: 'PATCH',
        params: { id: reportId },
        body: { status, note },
    });
}
