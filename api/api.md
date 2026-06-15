# APIフォルダー構成について

この `api` フォルダーは、React側から送られてきたリクエストを受け取り、PHPでデータベース操作を行うためのバックエンド部分です。

Reactは直接MySQLに接続できないため、必ずPHPのAPIを経由してデータの取得・登録・更新・削除を行います。

---

## 全体構成

```text
api/
├── config/
│   └── db.php
├── auth/
│   ├── login.php
│   └── register.php
├── users/
├── groups/
├── trips/
├── expenses/
├── settlements/
├── chats/
├── itineraries/
├── albums/
└── test.php
```

---

## config フォルダー

```text
api/config/
└── db.php
```

### 役割

データベース接続に関する設定をまとめるフォルダーです。

主に以下の情報を管理します。

* DBサーバー名
* DB名
* DBユーザー名
* DBパスワード
* PDOによるMySQL接続処理

### 注意点

`db.php` にはDBのパスワードが書かれるため、React側やGitHubなどに公開しないよう注意します。

---

## auth フォルダー

```text
api/auth/
├── login.php
└── register.php
```

### 役割

ログインや会員登録など、認証に関する処理を行うフォルダーです。

### 主な処理

* 新規ユーザー登録
* ログイン
* パスワード確認
* セッション管理
* ログアウト処理

### 使用する主なテーブル

* users
* user_profiles
* user_roles

---

## users フォルダー

```text
api/users/
```

### 役割

ユーザー情報を扱うフォルダーです。

### 主な処理

* ユーザー情報の取得
* プロフィール情報の取得
* プロフィール編集
* アイコン画像URLの更新
* アカウント状態の確認

### 使用する主なテーブル

* users
* user_profiles
* user_devices

---

## groups フォルダー

```text
api/groups/
```

### 役割

旅行グループに関する処理を行うフォルダーです。

### 主な処理

* グループ作成
* グループ一覧取得
* グループ詳細取得
* グループメンバー取得
* 招待リンク作成
* 招待状態の更新

### 使用する主なテーブル

* user_groups
* group_members
* group_invitations

---

## trips フォルダー

```text
api/trips/
```

### 役割

旅行そのものの情報を管理するフォルダーです。

### 主な処理

* 旅行作成
* 旅行一覧取得
* 旅行詳細取得
* 旅行情報更新
* 旅行候補の登録
* 日程候補の投票
* 決定事項の登録

### 使用する主なテーブル

* trips
* trip_members
* trip_candidates
* trip_candidate_votes
* trip_date_candidates
* trip_date_votes
* trip_decisions

---

## itineraries フォルダー

```text
api/itineraries/
```

### 役割

旅行の日程表やスケジュールを管理するフォルダーです。

### 主な処理

* 旅程の作成
* 旅程一覧取得
* 1日ごとの予定取得
* 行程項目の追加
* 行程項目の並び替え
* 行程項目の削除

### 使用する主なテーブル

* itineraries
* itinerary_items

---

## expenses フォルダー

```text
api/expenses/
```

### 役割

旅行中の支払い情報を管理するフォルダーです。

### 主な処理

* 支払い登録
* 支払い一覧取得
* 誰が払ったかの管理
* 誰がいくら負担するかの管理
* 支払い内容の編集
* 支払い削除

### 使用する主なテーブル

* expenses
* expense_participants

---

## settlements フォルダー

```text
api/settlements/
```

### 役割

割り勘後の精算情報を管理するフォルダーです。

### 主な処理

* 精算一覧取得
* 誰が誰にいくら払うかの取得
* 精算状態の更新
* 精算完了処理
* 未精算一覧の取得

### 使用する主なテーブル

* settlements
* expenses
* expense_participants

---

## chats フォルダー

```text
api/chats/
```

### 役割

グループ内チャットを管理するフォルダーです。

### 主な処理

* チャットルーム取得
* メッセージ一覧取得
* メッセージ送信
* 既読管理
* チャット参加者取得

### 使用する主なテーブル

* chats
* chat_members
* messages
* message_reads

---

## albums フォルダー

```text
api/albums/
```

### 役割

旅行アルバムや写真に関する処理を行うフォルダーです。

### 主な処理

* アルバム作成
* アルバム一覧取得
* 写真情報登録
* 写真一覧取得
* 写真へのタグ付け
* キャプション編集

### 使用する主なテーブル

* albums
* photos
* photo_tags

---

## test.php

```text
api/test.php
```

### 役割

PHPとデータベースが正常に接続できるか確認するためのテスト用ファイルです。

### 目的

本格的にAPIを作る前に、以下を確認します。

* PHPがロリポップ上で動作しているか
* `db.php` が正しく読み込めるか
* MySQLに接続できるか
* JSON形式でレスポンスを返せるか

---

## APIの基本的な流れ

```text
React
↓
fetch / axios
↓
PHP API
↓
MySQL
↓
PHP API
↓
JSONでReactへ返す
```

ReactはPHPのAPIにリクエストを送り、PHPがMySQLとやり取りします。

その結果をJSON形式でReactに返します。

---

## 命名ルール

APIファイル名は、できるだけ処理内容が分かる名前にします。

例：

```text
create.php
list.php
detail.php
update.php
delete.php
login.php
register.php
```

---

## 例：旅行一覧を取得する場合

```text
api/trips/list.php
```

このAPIでは、ログイン中のユーザーが参加している旅行一覧を取得します。

使用する主なテーブルは以下です。

```text
trips
trip_members
```

---

## 例：支払いを登録する場合

```text
api/expenses/create.php
```

このAPIでは、誰がいくら支払ったかを登録します。

使用する主なテーブルは以下です。

```text
expenses
expense_participants
```

---

## セキュリティ上の注意

APIを作成するときは、以下に注意します。

* SQLを直接文字列結合しない
* PDOのプリペアドステートメントを使う
* パスワードは必ずハッシュ化する
* DBパスワードをReact側に書かない
* エラー内容をそのまま画面に表示しない
* ログインが必要なAPIではユーザー確認を行う

---

## まとめ

`api` フォルダーは、ReactとMySQLをつなぐためのバックエンド部分です。

各フォルダーは機能ごとに分けることで、どこに何の処理があるか分かりやすくなります。

卒業制作では、まず以下の順番で作成すると進めやすいです。

1. config/db.php
2. test.php
3. auth/register.php
4. auth/login.php
5. groups 系API
6. trips 系API
7. expenses 系API
8. settlements 系API
