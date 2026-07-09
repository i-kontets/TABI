/**
 * 管理者画面用モックデータ
 * API接続時はこのファイルを参照している各サービス関数の中身を差し替える。
 */

/* ===== ユーザー ===== */
export const mockUsers = [
    { id: 1024, name: 'さくら', email: 'sakura@example.com', status: '通常', registeredAt: '2026/04/10 14:32', lastLoginAt: '2026/07/02 10:25', age: 23, gender: '女性', emailVerified: true, phone: '-', bio: '旅行が大好きです!', groupCount: 3, postCount: 42 },
    { id: 1025, name: 'たくや', email: 'takuya@example.com', status: '通常', registeredAt: '2026/04/12 09:10', lastLoginAt: '2026/07/02 09:40', age: 25, gender: '男性', emailVerified: true, phone: '-', bio: '海と山が好き', groupCount: 2, postCount: 31 },
    { id: 1032, name: 'みほ', email: 'miho@example.com', status: '停止中', registeredAt: '2026/04/20 18:05', lastLoginAt: '2026/06/30 22:11', age: 22, gender: '女性', emailVerified: true, phone: '-', bio: 'グルメ旅がしたい', groupCount: 2, postCount: 18 },
    { id: 1002, name: 'ゆうき', email: 'yuuki@example.com', status: '通常', registeredAt: '2026/03/02 11:47', lastLoginAt: '2026/07/01 20:03', age: 24, gender: '男性', emailVerified: true, phone: '-', bio: '写真担当です', groupCount: 4, postCount: 55 },
    { id: 1005, name: '伊藤 太郎', email: 'taro@example.com', status: '通常', registeredAt: '2026/02/14 08:30', lastLoginAt: '2026/07/02 07:30', age: 28, gender: '男性', emailVerified: true, phone: '090-0000-0000', bio: '幹事役やります', groupCount: 5, postCount: 63 },
    { id: 1008, name: '山田 花子', email: 'hanako@example.com', status: '退会済み', registeredAt: '2026/01/20 15:00', lastLoginAt: '2026/06/10 12:00', age: 26, gender: '女性', emailVerified: false, phone: '-', bio: '', groupCount: 1, postCount: 4 },
    { id: 1011, name: '中村 翔', email: 'syo@example.com', status: '通常', registeredAt: '2026/05/01 10:22', lastLoginAt: '2026/07/01 23:45', age: 21, gender: '男性', emailVerified: true, phone: '-', bio: '初心者です', groupCount: 1, postCount: 7 },
    { id: 1013, name: 'まい', email: 'mai@example.com', status: '通常', registeredAt: '2026/05/18 13:11', lastLoginAt: '2026/07/02 08:15', age: 23, gender: '女性', emailVerified: true, phone: '-', bio: 'カフェ巡り', groupCount: 2, postCount: 12 },
];

/* ===== 旅行グループ ===== */
export const mockGroups = [
    {
        id: 'g1', name: '三重旅行', status: '公開中', creator: 'さくら', createdAt: '2026/04/20 15:30',
        period: '2026/05/14 (木) 〜 05/16 (土) 2泊3日', memberCount: 5, itineraryCount: 8, scheduleCount: 12, albumCount: 34,
        members: [
            { id: 1024, name: 'さくら', role: 'リーダー' },
            { id: 1025, name: 'たくや', role: 'メンバー' },
            { id: 1032, name: 'みほ', role: 'メンバー' },
            { id: 1002, name: 'ゆうき', role: 'メンバー' },
            { id: 1005, name: '伊藤 太郎', role: 'メンバー' },
        ],
    },
    {
        id: 'g2', name: '沖縄旅行', status: '公開中', creator: 'たくや', createdAt: '2026/05/02 12:00',
        period: '2026/06/10 (水) 〜 06/13 (土) 3泊4日', memberCount: 4, itineraryCount: 6, scheduleCount: 9, albumCount: 58,
        members: [
            { id: 1025, name: 'たくや', role: 'リーダー' },
            { id: 1024, name: 'さくら', role: 'メンバー' },
            { id: 1002, name: 'ゆうき', role: 'メンバー' },
            { id: 1013, name: 'まい', role: 'メンバー' },
        ],
    },
    {
        id: 'g3', name: '北海道旅行', status: '準備中', creator: 'みほ', createdAt: '2026/06/01 19:20',
        period: '2026/07/20 (月) 〜 07/23 (木) 3泊4日', memberCount: 3, itineraryCount: 2, scheduleCount: 0, albumCount: 0,
        members: [
            { id: 1032, name: 'みほ', role: 'リーダー' },
            { id: 1024, name: 'さくら', role: 'メンバー' },
            { id: 1011, name: '中村 翔', role: 'メンバー' },
        ],
    },
    {
        id: 'g4', name: '京都旅行', status: '公開中', creator: 'ゆうき', createdAt: '2026/06/12 08:44',
        period: '2026/08/15 (土) 〜 08/17 (月) 2泊3日', memberCount: 4, itineraryCount: 5, scheduleCount: 7, albumCount: 12,
        members: [
            { id: 1002, name: 'ゆうき', role: 'リーダー' },
            { id: 1025, name: 'たくや', role: 'メンバー' },
            { id: 1013, name: 'まい', role: 'メンバー' },
            { id: 1005, name: '伊藤 太郎', role: 'メンバー' },
        ],
    },
    {
        id: 'g5', name: '東京旅行', status: '公開中', creator: '伊藤 太郎', createdAt: '2026/06/20 21:10',
        period: '2026/09/05 (土) 〜 09/07 (月) 2泊3日', memberCount: 5, itineraryCount: 3, scheduleCount: 4, albumCount: 0,
        members: [
            { id: 1005, name: '伊藤 太郎', role: 'リーダー' },
            { id: 1024, name: 'さくら', role: 'メンバー' },
            { id: 1025, name: 'たくや', role: 'メンバー' },
            { id: 1032, name: 'みほ', role: 'メンバー' },
            { id: 1011, name: '中村 翔', role: 'メンバー' },
        ],
    },
];

/* ===== 話し合い・投稿 ===== */
export const mockPosts = [
    { id: 'p1', body: '伊勢神宮は外せないよね〜!', author: 'さくら', authorId: 1024, group: '三重旅行', groupId: 'g1', category: '旅行先候補', createdAt: '2026/07/02 10:30', likes: 5, replies: 3, reportCount: 0, status: '公開中' },
    { id: 'p2', body: '海の幸が食べたい!おすすめのお店知ってる人いますか?', author: 'たくや', authorId: 1025, group: '三重旅行', groupId: 'g1', category: '旅行先候補', createdAt: '2026/07/02 10:32', likes: 3, replies: 2, reportCount: 1, status: '公開中' },
    { id: 'p3', body: 'おすすめのスポット教えて!', author: 'みほ', authorId: 1032, group: '沖縄旅行', groupId: 'g2', category: 'その他', createdAt: '2026/07/02 09:58', likes: 2, replies: 4, reportCount: 0, status: '公開中' },
    { id: 'p4', body: '宿泊先どこがいいかな?', author: 'ゆうき', authorId: 1002, group: '沖縄旅行', groupId: 'g2', category: '宿泊先候補', createdAt: '2026/07/02 09:40', likes: 1, replies: 6, reportCount: 0, status: '公開中' },
    { id: 'p5', body: '夜ご飯どうする?', author: '伊藤 太郎', authorId: 1005, group: '北海道旅行', groupId: 'g3', category: 'その他', createdAt: '2026/07/02 09:10', likes: 0, replies: 2, reportCount: 0, status: '公開中' },
    { id: 'p6', body: '(不適切な内容を含む投稿)', author: 'たくや', authorId: 1025, group: '三重旅行', groupId: 'g1', category: 'その他', createdAt: '2026/07/01 22:15', likes: 0, replies: 0, reportCount: 2, status: '非表示' },
];

/* ===== 通報 ===== */
export const mockReports = [
    { id: 'r1', type: '不適切な投稿', status: '未対応', target: 'たくや', targetId: 1025, targetPostId: 'p2', reporter: 'さくら', reporterId: 1024, reason: '不適切な内容', detail: '海の幸が食べたい!おすすめのお店知ってる人いますか?', note: '不快な表現が含まれています。', reportedAt: '2026/07/02 10:40' },
    { id: 'r2', type: '不適切な画像', status: '確認中', target: 'ゆうき', targetId: 1002, targetPostId: null, reporter: 'みほ', reporterId: 1032, reason: '不適切な画像の投稿', detail: 'アルバムにアップロードされた画像', note: '', reportedAt: '2026/07/02 09:20' },
    { id: 'r3', type: '迷惑行為', status: '確認中', target: 'みほ', targetId: 1032, targetPostId: null, reporter: 'ゆうき', reporterId: 1002, reason: '北海道旅行のチャットでの迷惑行為', detail: 'チャットでのスパム行為', note: '', reportedAt: '2026/07/02 08:50' },
    { id: 'r4', type: '個人情報の掲載', status: '対応済み', target: '伊藤 太郎', targetId: 1005, targetPostId: null, reporter: 'まい', reporterId: 1013, reason: '東京旅行の投稿に個人情報', detail: '電話番号が記載された投稿', note: '該当投稿を非表示にしました。', reportedAt: '2026/07/01 07:30' },
    { id: 'r5', type: 'なりすまし疑い', status: '未対応', target: '中村 翔', targetId: 1011, targetPostId: null, reporter: '伊藤 太郎', reporterId: 1005, reason: '三重旅行のユーザーになりすまし', detail: '他ユーザーを装った発言', note: '', reportedAt: '2026/07/01 18:00' },
];

/* ===== お問い合わせ ===== */
export const mockInquiries = [
    { id: 'INQ-20260702-001', title: 'ログインできない', status: '未対応', user: 'さくら', userId: 1024, category: 'ログイン', body: 'パスワードは合っているのにログインできません。どうすればいいですか?', hasAttachment: true, createdAt: '2026/07/02 10:59', memo: '' },
    { id: 'INQ-20260702-002', title: '画像がアップロードできない', status: '未対応', user: 'ゆうき', userId: 1002, category: '不具合', body: 'アルバムに画像をアップロードしようとするとエラーになります。', hasAttachment: false, createdAt: '2026/07/02 09:40', memo: '' },
    { id: 'INQ-20260701-005', title: 'グループに参加できません', status: '対応中', user: 'みほ', userId: 1032, category: '操作方法', body: '招待リンクを開いてもグループに参加できません。', hasAttachment: false, createdAt: '2026/07/01 18:20', memo: '招待リンクの有効期限切れの可能性。確認中。' },
    { id: 'INQ-20260701-004', title: 'しおりが保存されません', status: '対応中', user: '伊藤 太郎', userId: 1005, category: '不具合', body: 'しおりを編集して保存しても反映されていません。', hasAttachment: true, createdAt: '2026/07/01 15:10', memo: '再現確認済み。開発チームへ連携。' },
    { id: 'INQ-20260701-003', title: '退会方法がわからない', status: '対応済み', user: '山田 花子', userId: 1008, category: '操作方法', body: 'アカウントを削除したいのですが方法がわかりません。', hasAttachment: false, createdAt: '2026/07/01 11:30', memo: '手順を案内し、退会完了。' },
    { id: 'INQ-20260702-003', title: 'パスワードのリセット方法', status: '未対応', user: '伊藤 太郎', userId: 1005, category: 'ログイン', body: 'パスワードを忘れてしまいました。リセット方法を教えてください。', hasAttachment: false, createdAt: '2026/07/02 08:05', memo: '' },
];

/* ===== お知らせ ===== */
export const mockNotices = [
    { id: 'n1', title: 'メンテナンスのお知らせ', body: '下記の日程でメンテナンスを実施します。ご迷惑をおかけしますが、よろしくお願いいたします。', target: '全ユーザー', status: '公開中', startAt: '2026/07/01 00:00', endAt: '2026/07/07 23:59', push: true, readRate: 72 },
    { id: 'n2', title: '新機能リリースのお知らせ', body: 'しおり共有機能をリリースしました。ぜひご利用ください。', target: '全ユーザー', status: '公開中', startAt: '2026/06/20 00:00', endAt: '2026/07/20 23:59', push: true, readRate: 64 },
    { id: 'n3', title: '利用規約改定のお知らせ', body: '2026年7月1日より利用規約を改定します。', target: '全ユーザー', status: '終了', startAt: '2026/06/15 00:00', endAt: '2026/06/30 23:59', push: false, readRate: 88 },
    { id: 'n4', title: '不具合のお詫び', body: '6月8日に発生した障害についてお詫び申し上げます。', target: '全ユーザー', status: '終了', startAt: '2026/05/28 00:00', endAt: '2026/06/10 23:59', push: false, readRate: 91 },
];

/* ===== スポット ===== */
export const mockSpots = [
    { id: 's1', name: '伊勢神宮', category: '観光地・神社', prefecture: '三重県', address: '三重県伊勢市宇治館町1', lat: 34.4893, lng: 136.7097, status: '公開中' },
    { id: 's2', name: '鳥羽水族館', category: '観光地・水族館', prefecture: '三重県', address: '三重県鳥羽市鳥羽3-3-6', lat: 34.4813, lng: 136.8437, status: '公開中' },
    { id: 's3', name: '白良浜', category: '観光地・ビーチ', prefecture: '和歌山県', address: '和歌山県西牟婁郡白浜町864', lat: 33.6851, lng: 135.3369, status: '非公開' },
    { id: 's4', name: '清水寺', category: '観光地・寺院', prefecture: '京都府', address: '京都府京都市東山区清水1-294', lat: 34.9949, lng: 135.7850, status: '公開中' },
];

export const spotCategories = ['観光地・神社', '観光地・寺院', '観光地・水族館', '観光地・ビーチ', 'グルメ', '宿泊', 'その他'];

export const prefectures = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];

/* ===== 分析・ダッシュボード ===== */
export const mockAnalytics = {
    summary: {
        newUsers: { value: 12, diff: 3 },
        newGroups: { value: 5, diff: 1 },
        activeUsers: { value: 236, diff: 12 },
        pendingInquiries: 3,
        pendingReports: 1,
        systemErrors: 0,
        totalUsers: 2843,
    },
    activeUserTrend: {
        labels: ['6/26', '6/27', '6/28', '6/29', '6/30', '7/1', '7/2'],
        data: [180, 210, 175, 195, 230, 224, 236],
    },
    userAttributes: [
        { label: '10代', value: 15 },
        { label: '20代', value: 45 },
        { label: '30代', value: 25 },
        { label: '40代以上', value: 15 },
    ],
    usage: {
        newUsers7d: 42,
        groupsCreated7d: 18,
        posts7d: 312,
        uploads7d: 954,
    },
    featureRanking: [
        { name: 'スケジュール', count: 1240 },
        { name: '話し合い', count: 1102 },
        { name: 'アルバム', count: 986 },
        { name: 'しおり', count: 754 },
        { name: 'チェックリスト', count: 512 },
    ],
};

/* ===== 最近のアクティビティ(ダッシュボード) ===== */
export const mockActivities = [
    { id: 'a1', text: '新規ユーザー登録:さくらさんが登録しました', time: '10:25', type: 'user' },
    { id: 'a2', text: '旅行グループ作成:三重旅行が作成されました', time: '09:40', type: 'group' },
    { id: 'a3', text: 'お問い合わせ受信:ログインできない', time: '09:15', type: 'inquiry' },
    { id: 'a4', text: '通報がありました:不適切な投稿', time: '08:50', type: 'report' },
    { id: 'a5', text: 'お知らせを公開しました:メンテナンスのお知らせ', time: '07:30', type: 'notice' },
];

/* ===== 管理者 ===== */
export const mockManagers = [
    { id: 'm1', name: '管理者', role: 'オーナー', email: 'owner@tabi-admin.jp', lastLoginAt: '2026/07/02 10:10', status: '通常' },
    { id: 'm2', name: 'サポート担当A', role: 'サポート', email: 'support-a@tabi-admin.jp', lastLoginAt: '2026/07/01 09:30', status: '通常' },
    { id: 'm3', name: 'サポート担当B', role: 'サポート', email: 'support-b@tabi-admin.jp', lastLoginAt: '2026/07/01 18:45', status: '通常' },
    { id: 'm4', name: '閲覧専用', role: '閲覧のみ', email: 'viewer@tabi-admin.jp', lastLoginAt: '2026/07/01 11:20', status: '通常' },
];

/* ===== 操作ログ ===== */
export const mockLogs = [
    { id: 'l1', at: '2026/07/02 10:30', manager: '管理者(オーナー)', action: 'ユーザーID:1025を利用停止にしました', target: 'ユーザー' },
    { id: 'l2', at: '2026/07/02 10:10', manager: '管理者(オーナー)', action: 'お知らせを公開しました', target: 'お知らせ' },
    { id: 'l3', at: '2026/07/02 09:58', manager: 'サポート担当A', action: '投稿を非表示にしました', target: '投稿' },
    { id: 'l4', at: '2026/07/02 09:30', manager: 'サポート担当A', action: 'お問い合わせに返信しました', target: 'お問い合わせ' },
    { id: 'l5', at: '2026/07/02 08:30', manager: '管理者(オーナー)', action: '通報ID:45を対応済みに変更しました', target: '通報' },
    { id: 'l6', at: '2026/07/01 18:44', manager: 'サポート担当B', action: 'お問い合わせにメモを更新しました', target: 'お問い合わせ' },
    { id: 'l7', at: '2026/07/01 15:10', manager: 'サポート担当B', action: 'お知らせを作成しました', target: 'お知らせ' },
    { id: 'l8', at: '2026/07/01 11:02', manager: '管理者(オーナー)', action: 'スポット情報を編集しました', target: 'スポット' },
];
