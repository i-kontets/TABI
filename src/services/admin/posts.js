import { fetchResource, fetchResourceItem, updateResource } from './client';

export function fetchPosts({ query = '', category = '', page = 1 } = {}) {
    return fetchResource('posts', { query, category, page });
}

export function fetchPost(postId) {
    return fetchResourceItem('posts', postId);
}

export function togglePostVisibility(postId) {
    return updateResource('posts', postId, {}, { action: 'toggle-visibility' });
}

export function deletePost(postId) {
    return updateResource('posts', postId, {}, { action: 'delete' });
}
