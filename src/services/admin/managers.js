import { adminRequest } from './client';

// 管理者一覧を取得します。
// 返却形式が items 包装か生配列かに揺れがあるため、必要なら items を優先して取り出します。
export function fetchManagers() {
    return adminRequest('managers').then((result) => result.items ?? result);
}

// 管理者ユーザーを新規作成します。
export function createManager(data) {
    return adminRequest('managers', {
        method: 'POST',
        body: data,
    });
}

// 管理者の状態を切り替えます。
// 画面側では停止中と通常をトグルする用途で使います。
export function toggleManagerStatus(managerId) {
    return adminRequest('managers', {
        method: 'PATCH',
        params: { id: managerId },
    });
}
