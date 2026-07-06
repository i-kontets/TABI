import { adminRequest } from './client';

export function fetchPosts({ query = '', category = '', page = 1 } = {}) {
    return adminRequest('posts', { params: { query, category, page } });
}

export function fetchPost(postId) {
    return adminRequest('posts', { params: { id: postId } });
}

export function togglePostVisibility(postId) {
    return adminRequest('posts', {
        method: 'PATCH',
        params: { id: postId, action: 'toggle-visibility' },
    });
}

export function deletePost(postId) {
    return adminRequest('posts', {
        method: 'PATCH',
        params: { id: postId, action: 'delete' },
    });
}
