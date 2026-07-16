/**
 * 管理画面の各ページが使う API 呼び出しを、機能ごとに分けてまとめています。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理画面から渡された検索条件や入力内容、API から返った JSON を主に扱います。
 */
import { createResource, fetchResource, updateResource } from './client';

export function fetchManagers() {
    // API などの非同期処理が終わった後に、受け取った結果を次の処理へ渡します。
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
