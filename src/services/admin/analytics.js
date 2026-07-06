import { adminRequest } from './client';

// 管理ダッシュボード用の集計データを取得します。
export function fetchAnalytics() {
    return adminRequest('analytics');
}

// 管理画面の操作履歴を取得します。
export function fetchActivities() {
    return adminRequest('activities');
}
