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

* 旅行そのもの
* グループ
* 参加者
* 候補日
* 投票
* 行程
* 行き先

のように分ける。  
これをすると後で画面が増えてもDBが壊れにくい

## 2. 「１テーブル１意味」にする

例えば「旅行」に関する情報でも、

* 旅行名
* 開始日/終了日
* 作成者
* グループ
* 公開/非公開
* 旅行の確定状態

は `trips` に入れていい  
でも、  

* 誰が参加しているか
* その人の役割
* 招待中か参加済みか

まで `trips` に入れるのはダメ！！  
これは参加関係なので別テーブルになる  

つまり、

*  `trips` = 旅行そのもの
*  `trips_members` = 旅行への参加関係

と分かれる

## 現時点の設計イメージ (2026 / 04 / 22)
以下のように考えるとかなり実務っぽいです。

## A. ユーザー・認証まわり

```
users
    user_id
    name
    email
    password_hash
    icon_url
    language_code
    status
    created_at
    updated_at
    deleted_at
```
```
user_profiles
    user_id
    nickname
    birthday
    gender（必要なら）
    self_introduction
    country_code
    timezone
```
```
user_devices
    device_id
    user_id
    push_token
    platform
    last_login_at
```
```
roles
    role_id
    role_name
```
```
user_roles
    user_id
    role_id
```

理由は、  
**ユーザー基本情報**と**権限**と**端末**は責務が違うからです。  

## B. グループ機能

```
groups
    group_id
    group_name
    created_by
    description
    status
    created_at
    updated_at
```
```
group_members
    group_member_id
    group_id
    user_id
    role_in_group
    joined_at
    invitation_status
```
```
group_invitations
    invitation_id
    group_id
    invited_by
    invited_user_id
    invitation_token
    status
    expired_at
    created_at
```
理由は、  
「グループ本体」と「所属」は別物だからです。  
1グループに複数人、1ユーザーが複数グループ所属できるので中間テーブルが必要です。

## C. 旅行計画

```
trips
    trip_id
    group_id
    title
    description
    start_date
    end_date
    destination_summary
    status（draft / voting / confirmed / completed / cancelled）
    created_by
    created_at
    updated_at
```
```
trip_members
    trip_member_id
    trip_id
    user_id
    participation_status
    joined_at
```

※グループと旅行は似ていますが、  
グループは長期的な集まり、旅行はその中のイベントです。  
分けたほうが後で複数旅行に対応しやすいです。

## D. 日程調整アンケート

```
trip_date_candidates
    candidate_id
    trip_id
    candidate_start_date
    candidate_end_date
    created_by
    created_at
```
```
trip_date_votes
    vote_id
    candidate_id
    user_id
    vote_type（yes / maybe / no）
    voted_at
```

これで「全員が参加可能な日程を決定」ができます。  
旅行テーブルに候補日をカンマ区切りで入れるのは現場ではかなり低評価です。

## E. 目的地・スポット・旅程

```
places 
    place_id
    place_name
    category
    latitude
    longitude
    address
    external_map_id
    created_at
```
```
trip_places
    trip_place_id
    trip_id
    place_id
    visit_date
    order_no
    memo
    stay_minutes
    created_by
```
```
itineraries
    itinerary_id
    trip_id
    itinerary_date
    title
    note
```
```
itinerary_items
    itinerary_item_id
    itinerary_id
    item_type（move / visit / meal / hotel / free_time）
    place_id
    start_time
    end_time
    order_no
    memo
```

ここはかなり大事です。  
旅行先を1つの文字列にせず、**スポットマスタ**と**旅行内で使う予定データ**を分けると質が上がります。

## F. Map連携

```
routes
    route_id
    trip_id
    departure_place_id
    arrival_place_id
    transport_mode
    estimated_minutes
    estimated_distance_m
    external_route_id
    created_at
```
```
route_snapshots
    snapshot_id
    route_id
    raw_response_json
    fetched_at
```
理由は、外部APIの返却値をそのまま本体テーブルに持たせず、  
**必要な主要項目だけ本体に保存し、詳細はスナップショットとして残す**と保守しやすいです。

## G. 割り勘・精算
```
expenses
    expense_id
    trip_id
    paid_by_user_id
    title
    amount
    currency_code
    expense_date
    category
    memo
    created_at
```
```
expense_participants
    expense_participant_id
    expense_id
    user_id
    share_ratio
    share_amount
    is_settled
```
```
settlements
    settlement_id
    trip_id
    from_user_id
    to_user_id
    amount
    status
    settled_at
    created_at
```
これが重要です。  
割り勘機能は「費用」と「負担者」が別です。

例えば3人旅行でAが1万円払ったとしても、  
負担割合が全員均等か、2人だけ対象かで変わります。  
だから expenses だけでは足りず、expense_participants が必要です。

現場ではこの分離ができているとかなり印象がいいです。

## H. アルバム
```
albums
    album_id
    trip_id
    title
    created_by
    created_at
```
```
photos
    photo_id
    album_id
    uploaded_by
    file_url
    thumbnail_url
    caption
    shot_at
    visibility
    created_at
```
```
photo_tags
    photo_tag_id
    photo_id
    tagged_user_id
```

写真ファイル自体はDBにバイナリ保存するより、  
実務では**S3などのオブジェクトストレージに置いて、DBにはURLやメタ情報だけ持つ**ことが多いです。

## I. しおり・持ち物・買い物
```
checklists
    checklist_id
    trip_id
    checklist_type（packing / shopping / todo）
    title
    created_by
    created_at
```
```
checklist_items
    checklist_item_id
    checklist_id
    item_name
    is_checked
    assigned_user_id
    sort_order
    created_at
    updated_at
```

これで「持ち物リスト」「買い物リスト」「やること」を共通化できます。  
機能ごとに別テーブルを乱立させないのが上手い設計です。

## J. 観光地ランキング・お気に入り・レビュー
```
favorites
    favorite_id
    user_id
    place_id
    created_at
```
```
reviews
    review_id
    user_id
    place_id
    trip_id
    rating
    comment
    created_at
    updated_at
```
```
review_eligibilities
    eligibility_id
    user_id
    trip_id
    place_id
    is_reviewable
    confirmed_at
```

「宿泊・予約した人だけレビュー可」にしたいなら、  
レビュー投稿資格を管理する考え方があると実務的です。

ランキングは別テーブルを持たず、
多くの場合は reviews を集計して作ります。
必要ならキャッシュテーブルを追加します。

```
place_ranking_daily
    ranking_date
    place_id
    score
    review_count
    rank_no
```

こういう**集計結果専用テーブル**は、性能対策で使います。

## K. 宿泊先chat
```
chats
    chat_id
    trip_id
    chat_type（group / hotel / support）
    related_entity_type
    related_entity_id
    created_at
```
```
chat_members
    chat_member_id
    chat_id
    user_id
    joined_at
```
```
messages
    message_id
    chat_id
    sender_user_id
    message_type
    body
    sent_at
    deleted_at
```
```
message_reads
    message_read_id
    message_id
    user_id
    read_at
```

未読管理まで考えられるとかなり良いです。

## L. 管理画面

```
admin_users
    admin_user_id
    user_id
    admin_level
    created_at
```
```
audit_logs
    audit_log_id
    actor_user_id
    action_type
    target_table
    target_id
    before_value_json
    after_value_json
    created_at
```
```
system_settings
    setting_key
    setting_value
    updated_at
```

現場では**監査ログ**があるだけでかなり評価が上がります。  
特に管理画面がある場合は重要です。

# 制約について

## 1. 主キーは必ず明確にする

各テーブルに必ずPKを置きます。

例:

* `user_id`
* `trip_id`
* `expense_id`

UUIDでもAUTO_INCREMENTでもいいですが、統一が大事です。  
分散システムやデータベースでデータを一意に識別するための128ビットの数値

### 実務での考え方

* 小規模開発なら BIGINT AUTO_INCREMENT でも十分
* 分散や外部連携を強く意識するなら UUID もあり

## 2. 外部キーを貼る

例:

* `trips.group_id -> groups.group_id`
* `trip_members.trip_id -> trips.trip_id`
* `trip_members.user_id -> users.user_id`

外部キーを貼らないと、存在しないユーザーや旅行へのデータが作れてしまいます。

ただし、実務では性能や移行事情で外部キーを外すこともあります。  
でも卒業制作や通常設計では、**まず貼る前提**で考えた方が良いです。

## 3. NOT NULL を適切に使う

例えば `users.email` は普通 NOT NULL です。  
`trips.title` も普通 NOT NULL です。

逆に、

* `description`
* `memo`
* `thumbnail_url`

みたいな任意項目は NULL 可でよいです。

## 4. ENUMやコード値を乱用しない

例えば `status` に数値だけ入れて

*  0
*  1
*  2
*  3

とするのは、後で地獄になりやすいです。

まだ使うなら少なくとも設計書で

* draft
* confirmed
* completed
* cancelled

と意味を明記します。

おすすめは、

* 文字列コード
* またはマスタテーブル

です。

例：
*  `trip_status = 'draft'`
*  `vote_type = yes`

読みやすくなります。

## 5. １カラムに複数値を入れない

ダメな例：
*  `member_ids = '1, 2, 3'`
*  `photo_urls = 'a.jpg, b.jpeg, c.jpeg'`
*  `candidate_dates ='2026-05-01, 2026-05-03'`

これは検索・更新・集計が全部やりづらいです。なので、必ず別テーブルに分けます。

## 6. 命名規則を統一する

おすすめは英小文字スネークケース

*  `users`
*  `group_members`
*  `created_at`

カラム名もかぶらせない方がいい  
例えば作者名なら全部

*  `create_by`

更新日時なら全部

*  `updated_at`

にそろえる。

同じ意味なのに

*  `created_user`
*  `maker_id`
*  `regist_user`
*  `insert_user_id`

みたいに混ざるのはかなり危険です。

----
### インデックス設計も大事

高品質DBはテーブルを作って終わりではありません。  
**検索のされ方**まで考える

---
### どこにインデックスを貼るか

例えばこのアプリなら、

**user**
* unique index on `email`

**group_members**
* index on `group_id`
* index on `user_id`
* unique on `(group_id, user_id)`

**trips**
* index on `group_id`
* index on `(start_date, end_date)`
* index on `status`

**expenses**
* index on `trip_id`
* index on `paid_by_user_id`
* index on `expense_date`

**photos**
* ndex on `album_id`
* index on `uploaded_by`

**messages**
* index on `chat_id, sent_at`

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
* 旅行名
* 開始日
* 終了日
* 候補日1
* 候補日2
* 候補日3
* メンバー1
* メンバー2
* メンバー3
* 費用1
* 費用2

みたいに入れる設計

これは変更に弱く、絶対に壊れやすい。

---
### 悪い例２：NULLだらけの巨大なテーブル

例えば `activities` テーブル１つだけで
* photo_url
* amount
* review_comment
* checklist_item_name
* route_distance

全部持たせる設計

機能ごとに意味が違いすぎるのでNG

---
### 悪い例３：マスタとトランザクションが混ざる

例：
* `places` にユーザーごとのお気に入り状態まで入れる

これはダメ

`place` は場所マスタ、`favorites` はユーザーごとの行動データ

---

## DB作成するためのポイント 

### 1. 論理削除を考える

例：
* deleted_at

ユーザー削除、メッセージ削除、写真削除などで使う  
完全削除よりもトラブル対応や復元で便利

---

### 2. 監査カラムを揃える

多くのテーブルに
* `created_at`
* `updated_at`
* `created_by`
* `updated_by`

を入れる設計は強い  
管理画面があるなら特に有効

---

### 3. 予約・外部 API 連携は境界を分ける

外部サービスとつながる部分は別テーブルや別カラム群に寄せる

例：
* `external_reservation_id`
* `provider_name`
* `provider_status`
* `synced_at`

こうしておくと、外部使用変更に耐えやすい

---

### 4. 集計系は後からキャッシュテーブルを作る

観光地ランキングなどは最初から複雑にしすぎなくても大丈夫  
最初は `reviews` から算出し、重くなったら
* `place_ranking_daily`

を追加する流れが実務的

---

### 旅行アプリ向けのDB作成手順

そのまま実践しやすい流れ ↓

---

### Step１. 画面一覧ではなく「業務一覧」を作る

今回なら：

* ユーザー登録する
* グループを作る
* グループに招待する
* 旅行を作る
* 候補日を出す
* 投票する
* 行き先を登録する
* 支払いを登録する
* 負担者を決める
* 写真をアップロードする
* しおりを作る
* お気に入り登録する
* レビューを書く

この一覧を先に出す

---

### Step ２. 名詞を抜き出す

業務一覧から名詞を抜き出します

* ユーザー
* グループ
* 旅行
* 候補日
* 投票
* 場所
* 行程
* 支払い
* 負担者
* 写真
* アルバム
* しおり
* チェック項目
* お気に入り
* レビュー
* メッセージ

これがテーブル候補です

---

### Step ３. 主体・関係・履歴に分ける

例えば、

* 主体: `users`, `groups`, `trips`, `places`
* 関係: `group_members`, `trip_members`, `favorites`
* 履歴/明細: `trip_date_votes`, `expenses`, `messages`, `reviews`

これでかなり整理されます

---

### Step ４. 正規化する

「１セル１値」「１テーブル１意味」に直していきます

---

### Step ５. 制約を入れる

例：
* email は unique
* rating は 1〜5
* amount は 0以上
* vote_type は yes/maybe/no
* group_member は group_id + user_id で一意

---

### Step ６. インデックスを決める

一覧画面・検索画面・ JOIN 条件から決める

---

### Step ７. サンプルデータで検証する

例えば、

* 4人グループ
* 1旅行
* 候補日3つ
* 支払い5件
* 写真20枚
* チャット50件

くらいのサンプルを入れて、本当に困らないかを確認する。

これをすると設計ミスがかなり見つかる

---

### 優先して作るべきコアテーブル

最初はこの範囲で十分

* `users`
* `groups`
* `group_members`
* `trips`
* `trip_members`
* `trip_date_candidates`
* `trip_date_votes`
* `places`
* `trip_places`
* `expenses`
* `expense_participants`
* `settlements`
* `albums`
* `photos`
* `checklists`
* `checklist_items`

これだけでも完成度が高い！

---

### あとから追加で良いもの

* `favorites`
* `reviews`
* `messages`
* `audit_logs`
* `route_snapshots`
* `place_ranking_daily`
