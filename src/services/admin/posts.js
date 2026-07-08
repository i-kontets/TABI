import { mockPosts } from './mockData';
import { request, paginate } from './client';

// 話し合い・投稿一覧
export function fetchPosts({ query = '', category = '', page = 1 } = {}) {
    return request(() => {
        let list = mockPosts;
        if (query) list = list.filter((p) => p.body.includes(query) || p.author.includes(query));
        if (category && category !== 'すべて') list = list.filter((p) => p.category === category);
        return paginate(list, { page });
    });
}

// 投稿詳細
export function fetchPost(postId) {
    return request(() => mockPosts.find((p) => p.id === postId) || null);
}

// 非表示 / 再表示
export function togglePostVisibility(postId) {
    return request(() => {
        const p = mockPosts.find((x) => x.id === postId);
        if (p) p.status = p.status === '非表示' ? '公開中' : '非表示';
        return p;
    });
}

// 削除
export function deletePost(postId) {
    return request(() => {
        const idx = mockPosts.findIndex((x) => x.id === postId);
        if (idx >= 0) mockPosts.splice(idx, 1);
        return true;
    });
}
