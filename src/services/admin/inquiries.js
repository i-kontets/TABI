import { adminRequest } from './client';

export function fetchInquiries({ status = '', page = 1 } = {}) {
    return adminRequest('inquiries', { params: { status, page } });
}

export function fetchInquiryCounts() {
    return adminRequest('inquiries-counts');
}

export function fetchInquiry(inquiryId) {
    return adminRequest('inquiries', { params: { id: inquiryId } });
}

export function updateInquiry(inquiryId, { status, memo }) {
    return adminRequest('inquiries', {
        method: 'PATCH',
        params: { id: inquiryId },
        body: { status, memo },
    });
}

export function replyInquiry(inquiryId, message, { status, memo } = {}) {
    return adminRequest('inquiry-replies', {
        method: 'POST',
        params: { id: inquiryId },
        body: { message, status, memo },
    });
}
