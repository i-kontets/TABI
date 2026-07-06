import { adminRequest } from './client';

// お問い合わせ一覧を取得します。
// status と page を指定して、一覧の絞り込みとページングを行います。
export function fetchInquiries({ status = '', page = 1 } = {}) {
    return adminRequest('inquiries', { params: { status, page } });
}

// 状態別のお問い合わせ件数を取得します。
export function fetchInquiryCounts() {
    return adminRequest('inquiries-counts');
}

// お問い合わせ ID を指定して、単体の詳細を取得します。
export function fetchInquiry(inquiryId) {
    return adminRequest('inquiries', { params: { id: inquiryId } });
}

// お問い合わせの状態や管理メモを更新します。
export function updateInquiry(inquiryId, { status, memo }) {
    return adminRequest('inquiries', {
        method: 'PATCH',
        params: { id: inquiryId },
        body: { status, memo },
    });
}

// お問い合わせへの返信を送ります。
// 返信本文に加えて、必要なら状態や管理メモも一緒に送ります。
export function replyInquiry(inquiryId, message, { status, memo } = {}) {
    return adminRequest('inquiry-replies', {
        method: 'POST',
        params: { id: inquiryId },
        body: { message, status, memo },
    });
}
