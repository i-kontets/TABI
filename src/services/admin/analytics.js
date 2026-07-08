import { mockAnalytics, mockActivities } from './mockData';
import { request } from './client';

// ダッシュボード・分析画面用の統計データ
export function fetchAnalytics() {
    return request(() => mockAnalytics);
}

// 最近のアクティビティ
export function fetchActivities() {
    return request(() => mockActivities);
}
