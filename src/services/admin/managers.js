import { mockManagers } from './mockData';
import { request } from './client';

// 管理者一覧
export function fetchManagers() {
    return request(() => mockManagers);
}

// 管理者追加
export function createManager(data) {
    return request(() => {
        const manager = { id: `m${Date.now()}`, status: '通常', lastLoginAt: '-', ...data };
        mockManagers.push(manager);
        return manager;
    });
}

// アカウント停止 / 復旧
export function toggleManagerStatus(managerId) {
    return request(() => {
        const m = mockManagers.find((x) => x.id === managerId);
        if (m) m.status = m.status === '停止中' ? '通常' : '停止中';
        return m;
    });
}
