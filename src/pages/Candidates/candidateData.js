/**
 * 旅行先候補の一覧や詳細を表示し、候補選びを進める画面です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
export const categories = [
    { id: 'all', label: 'すべて' },
    { id: 'spot', label: '観光スポット' },
    { id: 'hotel', label: '宿泊先' },
    { id: 'restaurant', label: '飲食店' },
];

export const typeLabels = {
    spot: '観光',
    hotel: '宿泊',
    restaurant: '飲食',
};

export const candidatePlaces = [
    {
        id: 1,
        type: 'spot',
        name: '清水寺',
        area: '京都・東山',
        city: '京都',
        address: '京都府京都市東山区清水1-294',
        rating: 4.6,
        reviews: '12,480',
        price: '拝観料 500円〜',
        hours: '6:00〜18:00',
        tag: '歴史・景色',
        images: [
            'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1280&q=80',
        ],
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=760&q=80',
        description: '京都らしい街並みと舞台からの眺めを楽しめる定番スポット。',
        mapCenter: [135.785, 34.9949],
    },
    {
        id: 2,
        type: 'hotel',
        name: '京都ステイ 四条',
        area: '京都・四条',
        city: '京都',
        address: '京都府京都市下京区四条通烏丸東入',
        rating: 4.4,
        reviews: '2,103',
        price: '1泊 8,800円〜',
        hours: 'チェックイン 15:00 / チェックアウト 11:00',
        tag: '駅近・朝食あり',
        images: [
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1280&q=80',
        ],
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=760&q=80',
        description: '観光にも食事にも動きやすい中心エリアのホテル。',
        mapCenter: [135.758, 35.0064],
    },
    {
        id: 3,
        type: 'food',
        name: '京だし茶漬け ことのは',
        area: '京都・祇園',
        city: '京都',
        address: '京都府京都市東山区祇園町北側287',
        rating: 4.5,
        reviews: '864',
        price: '昼 1,600円〜',
        hours: '11:00〜21:00',
        tag: '和食・予約可',
        images: [
            'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=1280&q=80',
        ],
        image: 'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?auto=format&fit=crop&w=760&q=80',
        description: '歩き疲れた日にも入りやすい、やさしい味の和食店。',
        mapCenter: [135.7785, 35.0037],
    },
    {
        id: 4,
        type: 'spot',
        name: '浅草寺',
        area: '東京・浅草',
        city: '東京',
        address: '東京都台東区浅草2-3-1',
        rating: 4.5,
        reviews: '18,920',
        price: '入場無料',
        hours: '6:00〜17:00',
        tag: '街歩き・写真',
        images: [
            'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1280&q=80',
        ],
        image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=760&q=80',
        description: '仲見世通りと合わせて楽しめる、東京観光の人気エリア。',
        mapCenter: [139.7967, 35.7148],
    },
    {
        id: 5,
        type: 'hotel',
        name: 'ベイサイドホテル 東京',
        area: '東京・湾岸',
        city: '東京',
        address: '東京都江東区有明3-7-11',
        rating: 4.3,
        reviews: '1,582',
        price: '1泊 11,200円〜',
        hours: 'チェックイン 15:00 / チェックアウト 11:00',
        tag: '夜景・大浴場',
        images: [
            'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1568495248636-6432b97bd949?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1280&q=80',
        ],
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=760&q=80',
        description: '夜景を見ながらゆっくり過ごせる旅行向けホテル。',
        mapCenter: [139.791, 35.6349],
    },
    {
        id: 6,
        type: 'food',
        name: '築地 海鮮小路',
        area: '東京・築地',
        city: '東京',
        address: '東京都中央区築地4-10-16',
        rating: 4.4,
        reviews: '2,776',
        price: '朝食 1,900円〜',
        hours: '7:00〜15:00',
        tag: '海鮮・朝営業',
        images: [
            'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1280&q=80',
        ],
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=760&q=80',
        description: '朝から旅行気分を上げられる海鮮メニューが人気。',
        mapCenter: [139.771, 35.6654],
    },
];

export function getCandidatePlaceById(candidateId) {
    return candidatePlaces.find((place) => String(place.id) === String(candidateId));
}