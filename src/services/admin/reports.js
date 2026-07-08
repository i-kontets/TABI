import { mockReports } from './mockData';
import { request, paginate } from './client';

// 通報一覧(ステータスタブ)
export function fetchReports({ status = '', page = 1 } = {}) {
    return request(() => {
        let list = mockReports;
        if (status) list = list.filter((r) => r.status === status);
        return paginate(list, { page });
    });
}

// タブ用の件数
export function fetchReportCounts() {
    return request(() => ({
        '未対応': mockReports.filter((r) => r.status === '未対応').length,
        '確認中': mockReports.filter((r) => r.status === '確認中').length,
        '対応済み': mockReports.filter((r) => r.status === '対応済み').length,
    }));
}

// 通報詳細
export function fetchReport(reportId) {
    return request(() => mockReports.find((r) => r.id === reportId) || null);
}

// ステータス変更・メモ更新
export function updateReport(reportId, { status, note }) {
    return request(() => {
        const r = mockReports.find((x) => x.id === reportId);
        if (r) {
            if (status != null) r.status = status;
            if (note != null) r.note = note;
        }
        return r;
    });
}
