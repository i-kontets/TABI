import { createResource, fetchResource, updateResource } from './client';

export function fetchManagers() {
    return fetchResource('managers').then((result) => {
        // 管理者一覧APIはページング情報を含む { items, page, total... } 形式で返る。
        // 画面側は配列として描画しているため、itemsだけを取り出して iterable エラーを防ぐ。
        if (Array.isArray(result)) {
            return result;
        }

        return Array.isArray(result?.items) ? result.items : [];
    });
}

export function createManager(data) {
    return createResource('managers', data);
}

export function toggleManagerStatus(managerId) {
    return updateResource('managers', managerId, {}, { action: 'toggle-status' });
}
