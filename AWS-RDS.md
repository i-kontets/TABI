
# AWS RDS 接続・移行手順まとめ

このドキュメントは、TABIプロジェクトで **ロリポップ上のPHP APIから AWS RDS MySQL に接続するために行った作業** を、担当者以外でも追えるようにまとめたものです。

Reactの表示側担当、API担当、インフラ担当の誰が見ても、現在の状態・設定理由・接続手順・トラブル対応が分かることを目的にしています。

---

## 1. 今回の目的

TABIでは、観光地・飲食店・旅行情報・チャット・アルバム・写真メタ情報など、多くのデータを保存する必要があります。

ロリポップのDBだけでは容量や拡張性に不安があるため、DBは **AWS RDS MySQL** に移行しました。

画像本体はDBには保存せず、S3に保存します。RDSには画像の保存先キーやメタ情報だけを保存します。

```txt
DBに保存するもの:
  - ユーザー情報
  - 旅行情報
  - アルバム情報
  - 写真メタ情報
  - S3キー
  - チャット
  - スケジュール
  - 観光地・飲食店情報

S3に保存するもの:
  - 写真本体
  - アップロード画像
  - 将来的にはサムネイルなど
```

---

## 2. 現在の構成

```txt
React
  ↓
ロリポップ上のPHP API
  ↓
AWS RDS MySQL
  └─ DB名: tabidb
```

現在、ロリポップのPHP APIはRDSの `tabidb` に接続できています。

確認済みの状態:

```txt
ロリポップ SSH接続: OK
ロリポップからRDS MySQL接続: OK
RDSにtabidb作成: OK
SQLデータ取り込み: OK
PHP APIからRDS接続: OK
config/db.phpからRDS接続: OK
api/config/db.phpからRDS接続: OK
旧ロリポップDBホスト名の残存確認: OK
```

---

## 3. AWS RDSの設定

```txt
サービス: Amazon RDS
エンジン: MySQL
バージョン: MySQL 8.0.46
リージョン: アジアパシフィック 東京 ap-northeast-1
DBインスタンス識別子: tabi-rds
DB名: tabidb
マスターユーザー名: admin
ポート: 3306
```

RDSエンドポイント:

```txt
tabi-rds.crmq0gc46bxg.ap-northeast-1.rds.amazonaws.com
```

パスワードはこのドキュメントに書かないでください。`config/env.php` と `api/config/env.php` で管理しています。

```txt
RDSパスワード:
  このドキュメントには記載しない
  必要な人だけが安全な方法で共有する
```

---

## 4. なぜ MySQL 8.0.46 を使っているのか

最初に MySQL 8.4 系でRDSを作成しましたが、ロリポップ側のMySQLクライアントが古く、接続時に以下のような認証エラーが発生しました。

```txt
ERROR 2059 (HY000): Authentication plugin 'caching_sha2_password' cannot be loaded
```

ロリポップ側のMySQLクライアントは以下でした。

```txt
mysql Ver 14.14 Distrib 5.6.51
```

MySQL 8.4系では認証方式の相性問題が出たため、RDSを削除して **MySQL 8.0.46** で作り直しました。

その結果、ロリポップからRDSへ正常に接続できました。

```txt
MySQL 8.4系:
  ロリポップの古いmysqlクライアントと相性問題あり

MySQL 8.0.46:
  今回の環境では接続成功
```

---

## 5. なぜRDSをパブリックアクセスありにしたのか

ロリポップはAWS VPCの中にありません。

そのため、RDSを完全なプライベートDBにするとロリポップから直接接続できません。

今回の構成では、RDSを以下のように設定しました。

```txt
RDSパブリックアクセス:
  あり

ただし:
  セキュリティグループでロリポップの外向きIPだけを許可
```

これは、全世界にDBを開放するという意味ではありません。

RDS自体はパブリックアクセス可能ですが、実際に3306番へ接続できるのは、セキュリティグループで許可したIPだけです。

---

## 6. ロリポップの外向きIP確認

Tera TermでロリポップにSSH接続した後、以下を実行しました。

```bash
curl -s https://checkip.amazonaws.com
```

確認時のロリポップ外向きIP:

```txt
157.7.104.58
```

AWSのRDSセキュリティグループでは、このIPを `/32` で許可しました。

```txt
157.7.104.58/32
```

注意:

```txt
ロリポップのサーバー移設などで外向きIPが変わる可能性があります。
接続できなくなった場合は、まずこのIPを再確認してください。
```

---

## 7. RDSセキュリティグループ設定

セキュリティグループ名:

```txt
tabi-rds-sg
```

インバウンドルール:

```txt
タイプ: MySQL/Aurora
プロトコル: TCP
ポート: 3306
ソース: 157.7.104.58/32
```

アウトバウンドルール:

```txt
0.0.0.0/0
```

重要:

```txt
0.0.0.0/0 をインバウンドの3306に設定しないこと。
全世界からDBに接続できる危険な状態になります。
```

---

## 8. ロリポップへのSSH接続

Tera Termの接続設定:

```txt
ホスト: ssh.lolipop.jp
TCPポート: 2222
サービス: SSH
SSHバージョン: SSH2
```

ログイン情報:

```txt
ユーザー名: ロリポップのSSHアカウント / FTPアカウント
パスワード: SSHパスワード
```

ロリポップ管理画面で確認する場所:

```txt
ユーザー専用ページ
↓
サーバーの管理・設定
↓
SSH
```

---

## 9. RDSへのMySQL接続コマンド

ロリポップからRDSに入るコマンド:

```bash
mysql -h tabi-rds.crmq0gc46bxg.ap-northeast-1.rds.amazonaws.com -P 3306 -u admin -p --ssl-mode=REQUIRED --ssl-ca=/home/users/1/mond.jp-genshin/global-bundle.pem
```

パスワードを聞かれたら、RDSのパスワードを入力します。

成功すると以下のようになります。

```txt
mysql>
```

DBを選択:

```sql
USE tabidb;
```

テーブル一覧:

```sql
SHOW TABLES;
```

終了:

```sql
exit;
```

---

## 10. SSL証明書について

RDSへのSSL接続用に、以下の証明書をロリポップ側に保存しました。

```bash
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

保存場所:

```txt
/home/users/1/mond.jp-genshin/global-bundle.pem
```

RDS接続時に以下のように指定しています。

```bash
--ssl-mode=REQUIRED --ssl-ca=/home/users/1/mond.jp-genshin/global-bundle.pem
```

`VERIFY_IDENTITY` はロリポップ側のmysqlクライアントで未対応だったため、今回は `REQUIRED` を使用しています。

---

## 11. RDS内のDBとテーブル

DB名:

```txt
tabidb
```

確認済みテーブル例:

```txt
admin_users
albums
audit_logs
chat_members
chats
checklist_items
checklists
expense_participants
expenses
group_invitations
group_members
itineraries
itinerary_items
message_reads
messages
photo_tags
photos
roles
settlements
system_settings
trip_candidate_votes
trip_candidates
trip_date_candidates
trip_date_votes
trip_decisions
trip_members
trip_survey_options
trip_survey_votes
trip_surveys
trips
user_devices
user_groups
user_profiles
user_roles
users
```

---

## 12. photosテーブル構造

`photos` テーブルは以下の構造です。

```sql
DESCRIBE photos;
```

確認結果:

```txt
photo_id     bigint    PRIMARY KEY auto_increment
album_id     bigint    nullable
uploaded_by  bigint    nullable
file_url     text      nullable
caption      text      nullable
shot_at      datetime  nullable
```

S3対応では `file_url` にS3キーを保存しています。

例:

```txt
albums/1/photos/2026/07/01/d06f7559347d7c0b63bc0916e71038d0.png
```

既存の外部画像URLも残っています。

例:

```txt
https://images.unsplash.com/...
```

そのため、API側では以下のように扱っています。

```txt
file_url が http または https で始まる:
  既存の外部URLとしてそのまま表示

file_url が S3キー:
  S3の署名付きURLを作成して image_url として返す
```

---

## 13. ロリポップ側のDB設定ファイル

主に以下2つがあります。

```txt
/home/users/1/mond.jp-genshin/web/TABI/api/config/env.php
/home/users/1/mond.jp-genshin/web/TABI/api/api/config/env.php
```

共通DB接続ファイル:

```txt
/home/users/1/mond.jp-genshin/web/TABI/api/config/db.php
/home/users/1/mond.jp-genshin/web/TABI/api/api/config/db.php
```

`config/db.php` は以下のキーを見ています。

```php
DB_HOST
DB_NAME
DB_USER
DB_PASSWORD
```

そのため `env.php` は以下の形式にする必要があります。

```php
<?php
return [
    'DB_HOST' => 'tabi-rds.crmq0gc46bxg.ap-northeast-1.rds.amazonaws.com',
    'DB_NAME' => 'tabidb',
    'DB_USER' => 'admin',
    'DB_PASSWORD' => 'RDSのパスワード',
];
```

注意:

```txt
DB_DATABASE や DB_USERNAME ではなく、DB_NAME と DB_USER を使います。
```

---

## 14. configフォルダの直接アクセス防止

DBパスワードやAWSキーが入る `env.php` をブラウザから直接見られないように、`.htaccess` を設置しています。

設置場所:

```txt
api/config/.htaccess
api/api/config/.htaccess
```

中身:

```apache
Require all denied
```

作成コマンド:

```bash
cat > config/.htaccess <<'HTACCESS'
Require all denied
HTACCESS

cat > api/config/.htaccess <<'HTACCESS'
Require all denied
HTACCESS
```

---

## 15. PHP CLIの使い方

ロリポップのSSHでは `php` コマンドにパスが通っていなかったため、以下を使います。

```bash
/usr/local/php/8.3/bin/php
```

構文チェック例:

```bash
/usr/local/php/8.3/bin/php -l config/env.php
/usr/local/php/8.3/bin/php -l config/db.php
```

一時的に `php` コマンドを使いたい場合:

```bash
export PATH=/usr/local/php/8.3/bin:$PATH
```

確認:

```bash
php -v
```

---

## 16. PHPからRDS接続確認

確認コマンド:

```bash
/usr/local/php/8.3/bin/php -r 'require_once "config/db.php"; echo $pdo->query("SELECT DATABASE()")->fetchColumn() . PHP_EOL;'
```

成功結果:

```txt
tabidb
```

もう一つのDB設定も確認:

```bash
/usr/local/php/8.3/bin/php -r 'require_once "api/config/db.php"; echo $pdo->query("SELECT DATABASE()")->fetchColumn() . PHP_EOL;'
```

成功結果:

```txt
tabidb
```

---

## 17. ロリポップDBからRDSへのデータ移行

今回、ロリポップ上にあったSQLファイルを使ってRDSに取り込みました。

バックアップSQL:

```txt
test_data_rebuild.sql
```

現在は公開ディレクトリから退避済みです。

移行の考え方:

```txt
SQLファイル
  ↓
RDSのtabidbに流し込み
```

取り込みコマンド例:

```bash
mysql -h tabi-rds.crmq0gc46bxg.ap-northeast-1.rds.amazonaws.com -P 3306 -u admin -p --ssl-mode=REQUIRED --ssl-ca=/home/users/1/mond.jp-genshin/global-bundle.pem tabidb < test_data_rebuild.sql
```

途中で重複エラーが発生しました。

```txt
ERROR 1062 (23000): Duplicate entry 'cottage.manager@example.test' for key 'users.email'
```

原因:

```txt
SQL内に同じメールアドレスのテストユーザーが重複していた、または前回途中まで取り込まれたデータが残っていた
```

対応:

```txt
SQLを修正
RDSのtabidbをDROP/CREATE
再取り込み
```

DBを空にして作り直すコマンド:

```bash
mysql -h tabi-rds.crmq0gc46bxg.ap-northeast-1.rds.amazonaws.com -P 3306 -u admin -p --ssl-mode=REQUIRED --ssl-ca=/home/users/1/mond.jp-genshin/global-bundle.pem -e "DROP DATABASE IF EXISTS tabidb; CREATE DATABASE tabidb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## 18. データ確認コマンド

MySQLに入った後:

```sql
USE tabidb;
SHOW TABLES;
```

主要テーブル件数:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM trips;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM photos;
SELECT COUNT(*) FROM albums;
```

テーブル中身:

```sql
SELECT * FROM users LIMIT 10;
SELECT * FROM trips LIMIT 10;
SELECT * FROM messages LIMIT 10;
SELECT * FROM photos LIMIT 10;
SELECT * FROM albums LIMIT 10;
```

縦表示で見たい場合:

```sql
SELECT * FROM photos LIMIT 3\G
```

photosの最新データ:

```sql
SELECT photo_id, album_id, uploaded_by, file_url, caption, shot_at
FROM photos
ORDER BY photo_id DESC
LIMIT 5;
```

---

## 19. 旧ロリポップDB情報の残存確認

古いホスト名やSQLバックアップ名が残っていないか確認しました。

```bash
grep -R "mysql327.phy.lolipop.lan\|LAA1658851" . -n 2>/dev/null
```

何も出なければOKです。

過去に見えていた旧DBパスワード文字列も確認しました。

```bash
grep -R "2024gakusei" . -n 2>/dev/null
```

注意:

```txt
env.phpに現在のRDSパスワードとして残っている場合は、必要に応じてRDSパスワード変更後に更新すること。
```

---

## 20. 公開ディレクトリから退避したファイル

以下のようなファイルは公開ディレクトリに置かないようにしました。

```txt
config/env.php.bak
LAA1658851-web.sql
test_data_rebuild.sql
test.php
s3-test.php
```

退避先例:

```txt
/home/users/1/mond.jp-genshin/backup/
```

理由:

```txt
SQLファイルやenvバックアップにはDB情報やテストユーザー情報が含まれる可能性があるため。
公開フォルダに置いたままだとURLから取得されるリスクがある。
```

---

## 21. API側の状態

DB接続ファイルを共通化しているため、多くのAPIは以下を読み込んでいます。

```php
require_once __DIR__ . '/../config/db.php';
```

または:

```php
require_once __DIR__ . '/config/db.php';
```

そのため、`config/env.php` と `config/db.php` がRDSを見るようになっていれば、多くのAPIはそのままRDSを参照します。

---

## 22. RDSパスワード変更時の手順

スクショなどでパスワードが見えた可能性があるため、必要に応じてRDSパスワードを変更してください。

AWS側:

```txt
RDS
↓
tabi-rds
↓
変更
↓
マスターパスワード変更
↓
すぐに適用
```

ロリポップ側で更新するファイル:

```txt
config/env.php
api/config/env.php
```

更新後の確認:

```bash
/usr/local/php/8.3/bin/php -r 'require_once "config/db.php"; echo $pdo->query("SELECT DATABASE()")->fetchColumn() . PHP_EOL;'

/usr/local/php/8.3/bin/php -r 'require_once "api/config/db.php"; echo $pdo->query("SELECT DATABASE()")->fetchColumn() . PHP_EOL;'
```

どちらも以下が出ればOKです。

```txt
tabidb
```

---

## 23. トラブルシューティング

### 23.1 Unknown MySQL server host

エラー:

```txt
ERROR 2005 (HY000): Unknown MySQL server host
```

原因:

```txt
RDSエンドポイントの入力ミス
0とo、1とlなどの打ち間違い
```

対応:

```txt
AWS RDS画面からエンドポイントをコピーして使う
手打ちしない
```

---

### 23.2 caching_sha2_password エラー

エラー:

```txt
Authentication plugin 'caching_sha2_password' cannot be loaded
```

原因:

```txt
RDS MySQL 8.4系とロリポップの古いMySQLクライアントの相性問題
```

対応:

```txt
RDSをMySQL 8.0.46で作り直した
```

---

### 23.3 セキュリティグループ設定ミス

症状:

```txt
接続がタイムアウトする
RDSに接続できない
```

確認:

```bash
curl -s https://checkip.amazonaws.com
```

AWS側で許可するIP:

```txt
取得したIP/32
```

今回:

```txt
157.7.104.58/32
```

---

### 23.4 PHPコマンドが見つからない

エラー:

```txt
php: コマンドが見つかりません
```

対応:

```bash
/usr/local/php/8.3/bin/php -v
```

または:

```bash
export PATH=/usr/local/php/8.3/bin:$PATH
php -v
```

---

## 24. チームへの注意事項

### 24.1 env.phpはGitに上げない

`env.php` にはDBパスワードやAWSキーが入ります。

`.gitignore` に以下を入れてください。

```gitignore
api/config/env.php
api/api/config/env.php
*.sql
*.bak
```

### 24.2 SQLファイルを公開フォルダに置かない

バックアップSQLには個人情報やパスワードに近い情報が含まれる可能性があります。

公開フォルダではなく、必要であれば `~/backup` に退避してください。

### 24.3 RDSはパブリックアクセスありなのでIP制限必須

RDSはロリポップから接続するためにパブリックアクセスありにしています。

その代わり、セキュリティグループでロリポップIPだけを許可しています。

```txt
絶対に 0.0.0.0/0 を3306で許可しないこと
```

---

## 25. 最終状態

```txt
AWS RDS MySQL:
  作成済み
  MySQL 8.0.46
  DB: tabidb
  ロリポップから接続OK

ロリポップPHP API:
  RDS接続OK
  config/db.php接続OK
  api/config/db.php接続OK

データ移行:
  完了

セキュリティ:
  RDSはロリポップIPのみ許可
  configフォルダ直接アクセス拒否済み
  危険なSQL/テストファイルは退避済み
```
