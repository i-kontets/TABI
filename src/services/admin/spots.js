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
import { createResource, deleteResource, fetchResource, fetchResourceItem, updateResource } from './client';

export const spotCategories = ['観光地・神社', '観光地・寺院', '観光地・水族館', '観光地・ビーチ', 'グルメ', '宿泊', 'その他'];
export const prefectures = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];

export function fetchSpots({ query = '', page = 1, prefecture = '', category = '' } = {}) {
    return fetchResource('spots', { query, page, prefecture, category });
}

export function fetchSpot(spotId) {
    return fetchResourceItem('spots', spotId);
}

export function createSpot(data) {
    return createResource('spots', data);
}

export function updateSpot(spotId, data) {
    return updateResource('spots', spotId, data);
}

export function deleteSpot(spotId) {
    return deleteResource('spots', spotId);
}
