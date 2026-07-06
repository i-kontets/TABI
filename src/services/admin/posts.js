import { adminRequest } from './client';

// 投稿一覧を取得します。
// query と category を渡して、検索とカテゴリ絞り込みを行います。
export function fetchPosts({ query = '', category = '', page = 1 } = {}) {
    return adminRequest('posts', { params: { query, category, page } });
}

// 投稿 ID を指定して、単体の詳細を取得します。
export function fetchPost(postId) {
    return adminRequest('posts', { params: { id: postId } });
}

// 投稿の公開状態を切り替えます。
export function togglePostVisibility(postId) {
    return adminRequest('posts', {
        method: 'PATCH',
        params: { id: postId, action: 'toggle-visibility' },
    });
}

// 投稿を管理画面上で削除します。
export function deletePost(postId) {
    return adminRequest('posts', {
        method: 'PATCH',
        params: { id: postId, action: 'delete' },
    });
}
