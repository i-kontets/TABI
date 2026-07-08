import { mockInquiries } from './mockData';
import { request, paginate } from './client';

// お問い合わせ一覧(ステータスタブ)
export function fetchInquiries({ status = '', page = 1 } = {}) {
    return request(() => {
        let list = mockInquiries;
        if (status) list = list.filter((i) => i.status === status);
        return paginate(list, { page });
    });
}

// タブ用の件数
export function fetchInquiryCounts() {
    return request(() => ({
        '未対応': mockInquiries.filter((i) => i.status === '未対応').length,
        '対応中': mockInquiries.filter((i) => i.status === '対応中').length,
        '対応済み': mockInquiries.filter((i) => i.status === '対応済み').length,
    }));
}

// お問い合わせ詳細
export function fetchInquiry(inquiryId) {
    return request(() => mockInquiries.find((i) => i.id === inquiryId) || null);
}

// ステータス変更・メモ更新・返信
export function updateInquiry(inquiryId, { status, memo }) {
    return request(() => {
        const i = mockInquiries.find((x) => x.id === inquiryId);
        if (i) {
            if (status != null) i.status = status;
            if (memo != null) i.memo = memo;
        }
        return i;
    });
}

export function replyInquiry(inquiryId, message) {
    return request(() => {
        const i = mockInquiries.find((x) => x.id === inquiryId);
        if (i) i.status = '対応中';
        return { ok: true, inquiryId, message };
    });
}
