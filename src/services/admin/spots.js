import { adminRequest } from './client';

// スポットのカテゴリ候補です。
// 画面側の選択肢としてそのまま利用します。
export const spotCategories = ['観光地・神社', '観光地・寺院', '観光地・水族館', '観光地・ビーチ', 'グルメ', '宿泊', 'その他'];

// 都道府県の候補です。
// スポット登録や編集のセレクトボックスに使います。
export const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

// スポット一覧を取得します。
// query と page を渡して、検索とページングを行います。
export function fetchSpots({ query = '', page = 1 } = {}) {
    return adminRequest('spots', { params: { query, page } });
}

// スポット ID を指定して、単体の詳細を取得します。
export function fetchSpot(spotId) {
    return adminRequest('spots', { params: { id: spotId } });
}

// 新しいスポットを登録します。
export function createSpot(data) {
    return adminRequest('spots', {
        method: 'POST',
        body: data,
    });
}

// 既存スポットの情報を更新します。
export function updateSpot(spotId, data) {
    return adminRequest('spots', {
        method: 'PATCH',
        params: { id: spotId },
        body: data,
    });
}

// スポットを論理削除します。
export function deleteSpot(spotId) {
    return adminRequest('spots', {
        method: 'DELETE',
        params: { id: spotId },
    });
}
