import { mockSpots, spotCategories, prefectures } from './mockData';
import { request, paginate } from './client';

export { spotCategories, prefectures };

// スポット一覧
export function fetchSpots({ query = '', page = 1 } = {}) {
    return request(() => {
        let list = mockSpots;
        if (query) list = list.filter((s) => s.name.includes(query) || s.prefecture.includes(query));
        return paginate(list, { page });
    });
}

// スポット詳細
export function fetchSpot(spotId) {
    return request(() => mockSpots.find((s) => s.id === spotId) || null);
}

// 作成
export function createSpot(data) {
    return request(() => {
        const spot = { id: `s${Date.now()}`, ...data };
        mockSpots.unshift(spot);
        return spot;
    });
}

// 更新
export function updateSpot(spotId, data) {
    return request(() => {
        const s = mockSpots.find((x) => x.id === spotId);
        if (s) Object.assign(s, data);
        return s;
    });
}

// 削除
export function deleteSpot(spotId) {
    return request(() => {
        const idx = mockSpots.findIndex((x) => x.id === spotId);
        if (idx >= 0) mockSpots.splice(idx, 1);
        return true;
    });
}
