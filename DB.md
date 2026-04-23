## 機能

1. 旅行計画
2. 割り勘
3. アルバム
4. しおり
5. 観光地ランキング
6. Map連携

### 次のフェーズ

7. 移動手段の予約
8. 宿泊先chat
9. お気に入り登録
10. 管理画面

#### 拡張

11. レビュー機能

## 画面

1. ログイン/新規登録
2. ホーム
3. グループ内ホーム
4. しおり作成/閲覧
5. 割り勘
6. アルバム
7. Map確認

があるので、
DBは最低でも次の領域に分けるべきです。

### DBテーブル

1. ユーザー
2. グループ
3. 旅行計画
4. 日程候補/アンケート
5. 目的地
6. 移動ルート
7. 支出/精算
8. 写真/アルバム
9. しおり/持ち物
10. お気に入り
11. レビュー
12. 運営管理

# 設計

## 1. 「テーブル」ではなく「業務単位」で分ける

画面単位でテーブルを作るのではなく、業務単位で分ける  
たとえば「旅行計画画面」があるから `travel_plan_screen` みたいな考え方はしません。  
代わりに、

- 旅行そのもの
- グループ
- 参加者
- 候補日
- 投票
- 行程
- 行き先

のように分ける。  
これをすると後で画面が増えてもDBが壊れにくい

## 2. 「１テーブル１意味」にする

例えば「旅行」に関する情報でも、

- 旅行名
- 開始日/終了日
- 作成者
- グループ
- 公開/非公開
- 旅行の確定状態

は `trips` に入れていい  
でも、

- 誰が参加しているか
- その人の役割
- 招待中か参加済みか

まで `trips` に入れるのはダメ！！  
これは参加関係なので別テーブルになる

つまり、

- `trips` = 旅行そのもの
- `trips_members` = 旅行への参加関係

と分かれる

## 現時点の設計イメージ (2026 / 04 / 22)

以下のように考えるとかなり実務っぽいです。

## A. ユーザー・認証まわり

```
users (
  user_id BIGINT PRIMARY KEY COMMENT 'ユーザーを一意に識別するID',

  name VARCHAR(100) NOT NULL COMMENT 'ユーザーの表示名（アプリ内で表示される名前）',

  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'ログイン用メールアドレス（一意制約で重複防止）',

  password_hash VARCHAR(255) NOT NULL COMMENT 'ハッシュ化されたパスワード（平文保存禁止）',

  icon_url TEXT COMMENT 'プロフィール画像のURL（外部ストレージ参照）',

  language_code VARCHAR(10) DEFAULT 'ja' COMMENT '言語設定（例: ja, en）',

  status VARCHAR(20) DEFAULT 'active' COMMENT 'アカウント状態（active / suspended / deleted）',

  created_at DATETIME NOT NULL COMMENT '作成日時',

  updated_at DATETIME NOT NULL COMMENT '更新日時',

  deleted_at DATETIME COMMENT '論理削除日時（NULLなら有効）'
);
```

```
user_profiles (
  user_id BIGINT PRIMARY KEY COMMENT 'usersテーブルとの1対1紐付け',

  nickname VARCHAR(100) COMMENT 'ニックネーム（表示用・任意）',

  birthday DATE COMMENT '生年月日（年齢計算などで使用）',

  gender VARCHAR(20) COMMENT '性別（任意・未設定可）',

  self_introduction TEXT COMMENT '自己紹介文',

  country_code VARCHAR(10) COMMENT '国コード（例: JP, US）',

  timezone VARCHAR(50) COMMENT 'タイムゾーン（例: Asia/Tokyo）'
);
```

```
user_devices (
  device_id BIGINT PRIMARY KEY COMMENT 'デバイス識別ID',

  user_id BIGINT NOT NULL COMMENT '所有ユーザーID',

  push_token TEXT COMMENT 'プッシュ通知用トークン',

  platform VARCHAR(20) COMMENT 'OS（iOS / Android / Web）',

  last_login_at DATETIME COMMENT '最終ログイン日時'
);
```

```
roles (
  role_id BIGINT PRIMARY KEY COMMENT 'ロールID（権限の種類を識別）',

  role_name VARCHAR(50) NOT NULL COMMENT 'ロール名（例: admin / user / moderator）'
);
```

```
user_roles (
  user_id BIGINT NOT NULL COMMENT 'ユーザーID（rolesとの中間テーブル）',

  role_id BIGINT NOT NULL COMMENT '付与されるロールID',

  PRIMARY KEY (user_id, role_id) COMMENT '同一ユーザーへの重複ロール付与防止'
);
```

理由は、  
**ユーザー基本情報**と**権限**と**端末**は責務が違うからです。

## B. グループ機能

```
groups (
  group_id BIGINT PRIMARY KEY COMMENT 'グループID',

  group_name VARCHAR(100) NOT NULL COMMENT 'グループ名',

  created_by BIGINT NOT NULL COMMENT '作成ユーザーID',

  description TEXT COMMENT 'グループ説明',

  status VARCHAR(20) DEFAULT 'active' COMMENT '状態（active / archived）',

  created_at DATETIME NOT NULL COMMENT '作成日時',

  updated_at DATETIME NOT NULL COMMENT '更新日時'
);
```

```
group_members (
  group_member_id BIGINT PRIMARY KEY COMMENT 'グループ所属レコードID',

  group_id BIGINT NOT NULL COMMENT '所属グループID',

  user_id BIGINT NOT NULL COMMENT '所属ユーザーID',

  role_in_group VARCHAR(20) DEFAULT 'member' COMMENT '役割（admin / member）',

  joined_at DATETIME COMMENT '参加日時',

  invitation_status VARCHAR(20) COMMENT '招待状態（pending / accepted / rejected）'
);
```

```
group_invitations (
  invitation_id BIGINT PRIMARY KEY COMMENT '招待ID',

  group_id BIGINT NOT NULL COMMENT '招待対象のグループID',

  invited_by BIGINT NOT NULL COMMENT '招待を送信したユーザーID',

  invited_user_id BIGINT COMMENT '招待されたユーザーID（未登録ユーザーはNULLも想定）',

  invitation_token VARCHAR(255) NOT NULL COMMENT '招待リンク用トークン（URL経由参加用）',

  status VARCHAR(20) COMMENT '状態（pending / accepted / expired / rejected）',

  expired_at DATETIME COMMENT '有効期限（期限切れ判定に使用）',

  created_at DATETIME NOT NULL COMMENT '作成日時'
);
```

理由は、  
「グループ本体」と「所属」は別物だからです。  
1グループに複数人、1ユーザーが複数グループ所属できるので中間テーブルが必要です。

## C. 旅行計画

```
trips (
  trip_id BIGINT PRIMARY KEY COMMENT '旅行ID',

  group_id BIGINT NOT NULL COMMENT '紐づくグループID',

  title VARCHAR(200) NOT NULL COMMENT '旅行タイトル',

  description TEXT COMMENT '旅行の説明',

  start_date DATE COMMENT '開始日（確定後に使用）',

  end_date DATE COMMENT '終了日',

  destination_summary TEXT COMMENT '行き先概要',

  status VARCHAR(20) COMMENT '状態（draft / voting / confirmed）',

  created_by BIGINT COMMENT '作成者',

  created_at DATETIME COMMENT '作成日時',

  updated_at DATETIME COMMENT '更新日時'
);
```

```
trip_members (
  trip_member_id BIGINT PRIMARY KEY COMMENT '旅行参加レコードID',

  trip_id BIGINT NOT NULL COMMENT '旅行ID',

  user_id BIGINT NOT NULL COMMENT '参加ユーザーID',

  participation_status VARCHAR(20) COMMENT '参加状態（joined / pending）',

  joined_at DATETIME COMMENT '参加日時'
);
```

※グループと旅行は似ていますが、  
グループは長期的な集まり、旅行はその中のイベントです。  
分けたほうが後で複数旅行に対応しやすいです。

## D. 日程調整アンケート

```
trip_date_candidates (
  candidate_id BIGINT PRIMARY KEY COMMENT '候補日ID',

  trip_id BIGINT NOT NULL COMMENT '旅行ID',

  candidate_start_date DATE COMMENT '候補開始日',

  candidate_end_date DATE COMMENT '候補終了日',

  created_by BIGINT COMMENT '登録者',

  created_at DATETIME COMMENT '登録日時'
);
```

```
trip_date_votes (
  vote_id BIGINT PRIMARY KEY COMMENT '投票ID',

  candidate_id BIGINT NOT NULL COMMENT '対象候補日ID',

  user_id BIGINT NOT NULL COMMENT '投票ユーザー',

  vote_type VARCHAR(10) COMMENT '投票結果（yes / maybe / no）',

  voted_at DATETIME COMMENT '投票日時'
);
```

これで「全員が参加可能な日程を決定」ができます。  
旅行テーブルに候補日をカンマ区切りで入れるのは現場ではかなり低評価です。

## E. 目的地・スポット・旅程

```
places (
  place_id BIGINT PRIMARY KEY COMMENT '観光地ID',

  place_name VARCHAR(200) COMMENT '名称',

  category VARCHAR(50) COMMENT 'カテゴリ（観光地 / 飲食店など）',

  latitude DECIMAL(10,7) COMMENT '緯度',

  longitude DECIMAL(10,7) COMMENT '経度',

  address TEXT COMMENT '住所',

  external_map_id VARCHAR(100) COMMENT '外部API識別子'
);
```

```
trip_places (
  trip_place_id BIGINT PRIMARY KEY COMMENT '旅行内訪問予定ID',

  trip_id BIGINT COMMENT '旅行ID',

  place_id BIGINT COMMENT '場所ID',

  visit_date DATE COMMENT '訪問予定日',

  order_no INT COMMENT '訪問順序',

  memo TEXT COMMENT 'メモ',

  stay_minutes INT COMMENT '滞在予定時間',

  created_by BIGINT COMMENT '登録者'
);
```

```
itineraries (
  itinerary_id BIGINT PRIMARY KEY COMMENT '旅程ID（1日単位の行程）',

  trip_id BIGINT NOT NULL COMMENT '対象旅行ID',

  itinerary_date DATE NOT NULL COMMENT '対象日（旅行内の日付）',

  title VARCHAR(200) COMMENT 'タイトル（例: 1日目プラン）',

  note TEXT COMMENT '備考・説明'
);
```

```
itinerary_items (
  itinerary_item_id BIGINT PRIMARY KEY COMMENT '行程項目ID',

  itinerary_id BIGINT NOT NULL COMMENT '所属旅程ID',

  item_type VARCHAR(20) COMMENT '種別（move / visit / meal / hotel / free_time）',

  place_id BIGINT COMMENT '関連する場所ID（移動・観光・宿泊など）',

  start_time DATETIME COMMENT '開始時刻',

  end_time DATETIME COMMENT '終了時刻',

  order_no INT COMMENT '表示順序（UI表示制御用）',

  memo TEXT COMMENT 'メモ・補足情報'
);
```

ここはかなり大事です。  
旅行先を1つの文字列にせず、**スポットマスタ**と**旅行内で使う予定データ**を分けると質が上がります。

## F. Map連携

```
routes (
  route_id BIGINT PRIMARY KEY COMMENT 'ルートID',

  trip_id BIGINT COMMENT '旅行ID',

  departure_place_id BIGINT COMMENT '出発地点',

  arrival_place_id BIGINT COMMENT '到着地点',

  transport_mode VARCHAR(20) COMMENT '移動手段（car / train）',

  estimated_minutes INT COMMENT '所要時間',

  estimated_distance_m INT COMMENT '距離（メートル）'
);
```

```
route_snapshots (
  snapshot_id BIGINT PRIMARY KEY COMMENT 'スナップショットID',

  route_id BIGINT NOT NULL COMMENT '対象ルートID',

  raw_response_json JSON NOT NULL COMMENT '外部APIの生レスポンス（デバッグ・再解析用）',

  fetched_at DATETIME NOT NULL COMMENT '取得日時'
);
```

理由は、外部APIの返却値をそのまま本体テーブルに持たせず、  
**必要な主要項目だけ本体に保存し、詳細はスナップショットとして残す**と保守しやすいです。

## G. 割り勘・精算

```
expenses (
  expense_id BIGINT PRIMARY KEY COMMENT '支払いID',

  trip_id BIGINT COMMENT '旅行ID',

  paid_by_user_id BIGINT COMMENT '支払者',

  title VARCHAR(200) COMMENT '内容（例: 宿代）',

  amount DECIMAL(10,2) COMMENT '金額',

  expense_date DATE COMMENT '支払日',

  category VARCHAR(50) COMMENT 'カテゴリ',

  memo TEXT COMMENT 'メモ'
);
```

```
expense_participants (
  expense_participant_id BIGINT PRIMARY KEY COMMENT '負担者ID',

  expense_id BIGINT COMMENT '支払いID',

  user_id BIGINT COMMENT '対象ユーザー',

  share_ratio DECIMAL(5,2) COMMENT '負担割合',

  share_amount DECIMAL(10,2) COMMENT '負担額',

  is_settled BOOLEAN COMMENT '精算済みか'
);
```

```
settlements (
  settlement_id BIGINT PRIMARY KEY COMMENT '精算ID',

  trip_id BIGINT NOT NULL COMMENT '対象旅行ID',

  from_user_id BIGINT NOT NULL COMMENT '支払う側ユーザー',

  to_user_id BIGINT NOT NULL COMMENT '受け取る側ユーザー',

  amount DECIMAL(10,2) NOT NULL COMMENT '精算金額',

  status VARCHAR(20) COMMENT '状態（pending / completed / cancelled）',

  settled_at DATETIME COMMENT '精算完了日時',

  created_at DATETIME NOT NULL COMMENT '作成日時'
);
```

これが重要です。  
割り勘機能は「費用」と「負担者」が別です。

例えば3人旅行でAが1万円払ったとしても、  
負担割合が全員均等か、2人だけ対象かで変わります。  
だから expenses だけでは足りず、expense_participants が必要です。

現場ではこの分離ができているとかなり印象がいいです。

## H. アルバム

```
albums (
  album_id BIGINT PRIMARY KEY COMMENT 'アルバムID',

  trip_id BIGINT COMMENT '旅行ID',

  title VARCHAR(200) COMMENT 'アルバム名',

  created_by BIGINT COMMENT '作成者',

  created_at DATETIME COMMENT '作成日時'
);
```

```
photos (
  photo_id BIGINT PRIMARY KEY COMMENT '写真ID',

  album_id BIGINT COMMENT '所属アルバム',

  uploaded_by BIGINT COMMENT 'アップロード者',

  file_url TEXT COMMENT '画像URL',

  caption TEXT COMMENT '説明',

  shot_at DATETIME COMMENT '撮影日時'
);
```

```
photo_tags (
  photo_tag_id BIGINT PRIMARY KEY COMMENT 'タグID',

  photo_id BIGINT NOT NULL COMMENT '対象写真ID',

  tagged_user_id BIGINT NOT NULL COMMENT 'タグ付けされたユーザーID'
);
```

写真ファイル自体はDBにバイナリ保存するより、  
実務では**S3などのオブジェクトストレージに置いて、DBにはURLやメタ情報だけ持つ**ことが多いです。

## I. しおり・持ち物・買い物

```
checklists (
  checklist_id BIGINT PRIMARY KEY COMMENT 'チェックリストID',

  trip_id BIGINT COMMENT '旅行ID',

  checklist_type VARCHAR(20) COMMENT '種類（持ち物 / 買い物）',

  title VARCHAR(200) COMMENT 'タイトル',

  created_by BIGINT COMMENT '作成者'
);
```

```
checklist_items (
  checklist_item_id BIGINT PRIMARY KEY COMMENT '項目ID',

  checklist_id BIGINT COMMENT 'チェックリストID',

  item_name VARCHAR(200) COMMENT '項目名',

  is_checked BOOLEAN COMMENT 'チェック状態',

  assigned_user_id BIGINT COMMENT '担当者',

  sort_order INT COMMENT '表示順'
);
```

これで「持ち物リスト」「買い物リスト」「やること」を共通化できます。  
機能ごとに別テーブルを乱立させないのが上手い設計です。

## J. 観光地ランキング・お気に入り・レビュー

```
favorites (
  favorite_id BIGINT PRIMARY KEY COMMENT 'お気に入りID',

  user_id BIGINT COMMENT 'ユーザーID',

  place_id BIGINT COMMENT '観光地ID',

  created_at DATETIME COMMENT '登録日時'
);
```

```
reviews (
  review_id BIGINT PRIMARY KEY COMMENT 'レビューID',

  user_id BIGINT COMMENT '投稿者',

  place_id BIGINT COMMENT '対象観光地',

  trip_id BIGINT COMMENT '関連旅行',

  rating INT COMMENT '評価（1〜5）',

  comment TEXT COMMENT 'レビュー内容'
);
```

```
review_eligibilities (
  eligibility_id BIGINT PRIMARY KEY COMMENT 'レビュー権限ID',

  user_id BIGINT NOT NULL COMMENT 'ユーザーID',

  trip_id BIGINT NOT NULL COMMENT '対象旅行ID',

  place_id BIGINT NOT NULL COMMENT '対象観光地ID',

  is_reviewable BOOLEAN NOT NULL COMMENT 'レビュー可能フラグ',

  confirmed_at DATETIME COMMENT '利用確認日時（宿泊・訪問証明）'
);
```

「宿泊・予約した人だけレビュー可」にしたいなら、  
レビュー投稿資格を管理する考え方があると実務的です。

ランキングは別テーブルを持たず、
多くの場合は reviews を集計して作ります。
必要ならキャッシュテーブルを追加します。

```
place_ranking_daily (
  ranking_date DATE NOT NULL COMMENT 'ランキング日付',

  place_id BIGINT NOT NULL COMMENT '観光地ID',

  score DECIMAL(10,2) COMMENT '評価スコア（平均や加重計算）',

  review_count INT COMMENT 'レビュー数',

  rank_no INT COMMENT '順位',

  PRIMARY KEY (ranking_date, place_id) COMMENT '日付ごとのランキング一意性'
);
```

こういう**集計結果専用テーブル**は、性能対策で使います。

## K. 宿泊先chat

```
chats (
  chat_id BIGINT PRIMARY KEY COMMENT 'チャットID',

  trip_id BIGINT COMMENT '紐づく旅行ID',

  chat_type VARCHAR(20) COMMENT '種別（group / hotel / support）',

  related_entity_type VARCHAR(50) COMMENT '関連エンティティ種別（hotel等）',

  related_entity_id BIGINT COMMENT '関連エンティティID',

  created_at DATETIME COMMENT '作成日時'
);
```

```
chat_members (
  chat_member_id BIGINT PRIMARY KEY COMMENT 'チャット参加ID',

  chat_id BIGINT NOT NULL COMMENT 'チャットID',

  user_id BIGINT NOT NULL COMMENT '参加ユーザー',

  joined_at DATETIME COMMENT '参加日時'
);
```

```
messages (
  message_id BIGINT PRIMARY KEY COMMENT 'メッセージID',

  chat_id BIGINT COMMENT 'チャットID',

  sender_user_id BIGINT COMMENT '送信者',

  body TEXT COMMENT '本文',

  sent_at DATETIME COMMENT '送信日時'
);
```

```
message_reads (
  message_read_id BIGINT PRIMARY KEY COMMENT '既読管理ID',

  message_id BIGINT NOT NULL COMMENT '対象メッセージID',

  user_id BIGINT NOT NULL COMMENT '既読ユーザーID',

  read_at DATETIME COMMENT '既読日時'
);
```

未読管理まで考えられるとかなり良いです。

## L. 管理画面

```
admin_users (
  admin_user_id BIGINT PRIMARY KEY COMMENT '管理者ID',

  user_id BIGINT NOT NULL COMMENT 'ユーザーID（usersと紐付け）',

  admin_level INT COMMENT '権限レベル（例: 1=一般管理者, 9=スーパー管理者）',

  created_at DATETIME COMMENT '登録日時'
);
```

```
audit_logs (
  audit_log_id BIGINT PRIMARY KEY COMMENT '監査ログID',

  actor_user_id BIGINT COMMENT '操作ユーザー',

  action_type VARCHAR(50) COMMENT '操作内容（更新/削除など）',

  target_table VARCHAR(50) COMMENT '対象テーブル',

  target_id BIGINT COMMENT '対象レコードID',

  created_at DATETIME COMMENT '実行日時'
);
```

```
system_settings (
  setting_key VARCHAR(100) PRIMARY KEY COMMENT '設定キー（例: max_upload_size）',

  setting_value TEXT COMMENT '設定値（文字列で柔軟に管理）',

  updated_at DATETIME COMMENT '更新日時'
);
```

現場では**監査ログ**があるだけでかなり評価が上がります。  
特に管理画面がある場合は重要です。

# 制約について

## 1. 主キーは必ず明確にする

各テーブルに必ずPKを置きます。

例:

- `user_id`
- `trip_id`
- `expense_id`

UUIDでもAUTO_INCREMENTでもいいですが、統一が大事です。  
分散システムやデータベースでデータを一意に識別するための128ビットの数値

### 実務での考え方

- 小規模開発なら BIGINT AUTO_INCREMENT でも十分
- 分散や外部連携を強く意識するなら UUID もあり

## 2. 外部キーを貼る

例:

- `trips.group_id -> groups.group_id`
- `trip_members.trip_id -> trips.trip_id`
- `trip_members.user_id -> users.user_id`

外部キーを貼らないと、存在しないユーザーや旅行へのデータが作れてしまいます。

ただし、実務では性能や移行事情で外部キーを外すこともあります。  
でも卒業制作や通常設計では、**まず貼る前提**で考えた方が良いです。

## 3. NOT NULL を適切に使う

例えば `users.email` は普通 NOT NULL です。  
`trips.title` も普通 NOT NULL です。

逆に、

- `description`
- `memo`
- `thumbnail_url`

みたいな任意項目は NULL 可でよいです。

## 4. ENUMやコード値を乱用しない

例えば `status` に数値だけ入れて

- 0
- 1
- 2
- 3

とするのは、後で地獄になりやすいです。

まだ使うなら少なくとも設計書で

- draft
- confirmed
- completed
- cancelled

と意味を明記します。

おすすめは、

- 文字列コード
- またはマスタテーブル

です。

例：

- `trip_status = 'draft'`
- `vote_type = yes`

読みやすくなります。

## 5. １カラムに複数値を入れない

ダメな例：

- `member_ids = '1, 2, 3'`
- `photo_urls = 'a.jpg, b.jpeg, c.jpeg'`
- `candidate_dates ='2026-05-01, 2026-05-03'`

これは検索・更新・集計が全部やりづらいです。なので、必ず別テーブルに分けます。

## 6. 命名規則を統一する

おすすめは英小文字スネークケース

- `users`
- `group_members`
- `created_at`

カラム名もかぶらせない方がいい  
例えば作者名なら全部

- `create_by`

更新日時なら全部

- `updated_at`

にそろえる。

同じ意味なのに

- `created_user`
- `maker_id`
- `regist_user`
- `insert_user_id`

みたいに混ざるのはかなり危険です。

---

### インデックス設計も大事

高品質DBはテーブルを作って終わりではありません。  
**検索のされ方**まで考える

---

### どこにインデックスを貼るか

例えばこのアプリなら、

**user**

- unique index on `email`

**group_members**

- index on `group_id`
- index on `user_id`
- unique on `(group_id, user_id)`

**trips**

- index on `group_id`
- index on `(start_date, end_date)`
- index on `status`

**expenses**

- index on `trip_id`
- index on `paid_by_user_id`
- index on `expense_date`

**photos**

- ndex on `album_id`
- index on `uploaded_by`

**messages**

- index on `chat_id, sent_at`

これがあると画面表示が安定します。

---

### インデックスの注意

貼りすぎるとINSERT/UPDATEが遅くなります。  
なので、

**よく検索される条件**  
**JOINによく使う列**  
**ユニーク制約が必要な列**

に絞るのがコツです。

---

## データベースNGな書き方

### 悪い例１：なんでも１テーブルに詰め込む

例えば `trips` に

- 旅行名
- 開始日
- 終了日
- 候補日1
- 候補日2
- 候補日3
- メンバー1
- メンバー2
- メンバー3
- 費用1
- 費用2

みたいに入れる設計

これは変更に弱く、絶対に壊れやすい。

---

### 悪い例２：NULLだらけの巨大なテーブル

例えば `activities` テーブル１つだけで

- photo_url
- amount
- review_comment
- checklist_item_name
- route_distance

全部持たせる設計

機能ごとに意味が違いすぎるのでNG

---

### 悪い例３：マスタとトランザクションが混ざる

例：

- `places` にユーザーごとのお気に入り状態まで入れる

これはダメ

`place` は場所マスタ、`favorites` はユーザーごとの行動データ

---

## DB作成するためのポイント

### 1. 論理削除を考える

例：

- deleted_at

ユーザー削除、メッセージ削除、写真削除などで使う  
完全削除よりもトラブル対応や復元で便利

---

### 2. 監査カラムを揃える

多くのテーブルに

- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

を入れる設計は強い  
管理画面があるなら特に有効

---

### 3. 予約・外部 API 連携は境界を分ける

外部サービスとつながる部分は別テーブルや別カラム群に寄せる

例：

- `external_reservation_id`
- `provider_name`
- `provider_status`
- `synced_at`

こうしておくと、外部使用変更に耐えやすい

---

### 4. 集計系は後からキャッシュテーブルを作る

観光地ランキングなどは最初から複雑にしすぎなくても大丈夫  
最初は `reviews` から算出し、重くなったら

- `place_ranking_daily`

を追加する流れが実務的

---

### 旅行アプリ向けのDB作成手順

そのまま実践しやすい流れ ↓

---

### Step１. 画面一覧ではなく「業務一覧」を作る

今回なら：

- ユーザー登録する
- グループを作る
- グループに招待する
- 旅行を作る
- 候補日を出す
- 投票する
- 行き先を登録する
- 支払いを登録する
- 負担者を決める
- 写真をアップロードする
- しおりを作る
- お気に入り登録する
- レビューを書く

この一覧を先に出す

---

### Step ２. 名詞を抜き出す

業務一覧から名詞を抜き出します

- ユーザー
- グループ
- 旅行
- 候補日
- 投票
- 場所
- 行程
- 支払い
- 負担者
- 写真
- アルバム
- しおり
- チェック項目
- お気に入り
- レビュー
- メッセージ

これがテーブル候補です

---

### Step ３. 主体・関係・履歴に分ける

例えば、

- 主体: `users`, `groups`, `trips`, `places`
- 関係: `group_members`, `trip_members`, `favorites`
- 履歴/明細: `trip_date_votes`, `expenses`, `messages`, `reviews`

これでかなり整理されます

---

### Step ４. 正規化する

「１セル１値」「１テーブル１意味」に直していきます

---

### Step ５. 制約を入れる

例：

- email は unique
- rating は 1〜5
- amount は 0以上
- vote_type は yes/maybe/no
- group_member は group_id + user_id で一意

---

### Step ６. インデックスを決める

一覧画面・検索画面・ JOIN 条件から決める

---

### Step ７. サンプルデータで検証する

例えば、

- 4人グループ
- 1旅行
- 候補日3つ
- 支払い5件
- 写真20枚
- チャット50件

くらいのサンプルを入れて、本当に困らないかを確認する。

これをすると設計ミスがかなり見つかる

---

### 優先して作るべきコアテーブル

最初はこの範囲で十分

- `users`
- `groups`
- `group_members`
- `trips`
- `trip_members`
- `trip_date_candidates`
- `trip_date_votes`
- `places`
- `trip_places`
- `expenses`
- `expense_participants`
- `settlements`
- `albums`
- `photos`
- `checklists`
- `checklist_items`

これだけでも完成度が高い！

---

### あとから追加で良いもの

- `favorites`
- `reviews`
- `messages`
- `audit_logs`
- `route_snapshots`
- `place_ranking_daily`
