/**
 * 管理画面の各ページが使う API 呼び出しを、機能ごとに分けてまとめています。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理画面から渡された検索条件や入力内容、API から返った JSON を主に扱います。
 */
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
