import { createResource, fetchResource, fetchResourceItem, updateResource } from './client';

export function fetchInquiries({ status = '', page = 1 } = {}) {
    return fetchResource('inquiries', { status, page });
}

export function fetchInquiryCounts() {
    return fetchResource('inquiries-counts');
}

export function fetchInquiry(inquiryId) {
    return fetchResourceItem('inquiries', inquiryId);
}

export function updateInquiry(inquiryId, { status, memo }) {
    return updateResource('inquiries', inquiryId, { status, memo });
}

export function replyInquiry(inquiryId, message) {
    return createResource('inquiries', { id: inquiryId, message });
}
