# 通知DB連携・RDS差分確認と修正結果

調査日: 2026-09-28。SSHとRDSへの読み取りは明示許可を受けて実施しました。
**本番DBの変更・配備・通知作成は未実行です。ローカルの修正と検証は完了しています。**

## 1. 原因

配備中の `web/TABI/api/Admin/handlers/post.php:97` は、管理者お知らせを `admin_notices` へINSERTし、管理画面向け `admin:global / notice_created` を送るだけでした。
`NotificationService`／`NotificationRepository` の呼び出しがなく、ユーザー向け通知・宛先を作りません。
公開日時やPushフラグの条件でスキップされたり、通知生成の例外を握りつぶしたりした事象ではありません。

配備中の `Admin/handlers/post.php`、`Admin/index.php`、`Notifications/Service/NotificationRepository.php` のSHA-256は、ローカルGit HEADと一致しました。
前回追加した `api/Admin/services/notices.php` は配備先にありません。修正はローカルのワークツリーに残っており、未配備です。

RDSでも、notice_id=4は存在する一方、notificationsは既存のnotification_id=2だけ、notification_recipientsも既存のrecipient_id=2だけでした。
実際のstatusは **published** です。提供情報の `publish` に合わせたコード変更は不要でした。
通知関連3テーブルのトリガーをinformation_schemaで照会した結果、返却行はありませんでした。

## 2. RDS確認状況

| 操作 | 状態 |
|---|---|
| ロリポップSSH接続 | 許可済み・実行済み |
| 配備通知PHP読み取り | 実行済み。設定値・パスワードは非出力 |
| RDS接続 | 許可済み・実行済み |
| RDS読み取り | SELECT / SHOWのみ実行済み。終了コード0 |
| RDS変更 | 未実行・未許可 |
| ローカル修正・テスト | 実行済み |
| 本番配備・本番テスト通知・過去通知の補完 | 未実行 |

認証はユーザーの対話入力です。SSH・RDSパスワードをチャット、ソース、SQL、報告書に保存していません。
SSH上のファイル読み取りでアプリのbootstrapを実行していません。

### 観測したデータ

読み取り時刻はUTC 2026-09-27 23:38:02（JST 2026-09-28 08:38:02）。
接続DBは指定されたDBと一致し、global/session/systemのタイムゾーンはすべてUTCでした。

| 項目 | RDS実測 |
|---|---|
| notice_id=4 | title=通知テスト、対象=全ユーザー、status=published、push_enabled=1、created_by=1、deleted_at=NULL |
| 公開開始・終了 | 2026-09-28 07:36:00 ～ 09:00:00。読み取り時点のJSTでは公開期間内 |
| notice_id=4のcreated_at / updated_at | 2026-09-27 22:36:02。UTCで記録された時刻 |
| お知らせstatus分布 | published=3件、ended=1件 |
| notifications | 1件。ID=2、subtype=notification_service_test。管理者お知らせの通知はない |
| notification_recipients | 1件。notification_id=2、user_id=2、is_read=1、delivered_at=NULL |
| 全ユーザー通知の有効対象 | status=activeかつdeleted_at=NULLの8ユーザー |
| notification_settings | 定義確認済み。設定値の取得・変更はしていない |

本番PHPの `php8.3` CLIは8.3.35、既定タイムゾーンはAsia/Tokyoでした。Web SAPIの設定は別なので同一と断定しません。
配備コードの公開日時保存は入力文字列をそのまま使い、created_at等はDBのNOW()を使っていました。DATETIME自体にタイムゾーン変換機能はありません。

## 3. RDSとTABIフォルダーの差分

4テーブルとも、AUTO_INCREMENTの現在値を除くSHOW CREATE TABLE全文が `backup.sql` と一致しました。
notifications等が `database/` にないことは、RDSにないことを意味しません。

| 項目 | RDS実測 | TABIフォルダー | 差分 | 対応 |
|---|---|---|---|---|
| admin_notices | 13列、InnoDB、PK notice_id、status索引。title200、created_by bigint | backup.sqlおよび旧ダンプに同構造。前回migrationが4列追加 | target_id / notification_id / request_key / realtime_published_atはRDSにない | 新実装を配備するには別途承認したALTERが必要。既存行の補完はしない |
| notifications | 12列、InnoDB。ID bigint、title150、created_by intとusersへのFK、detail_data JSON | backup.sqlには完全定義あり。database内の旧SQLにはCREATEなし | リポジトリの定義配置が不足。テーブル再作成は不要 | RDS実DDLを参照用schemaファイルへ収録 |
| notification_recipients | 7列、InnoDB。UNIQUE(notification_id,user_id)、notifications/usersへのFK | backup.sqlと一致。既存RepositoryのINSERT列と対応 | 型・制約の修正は不要 | 実DDLを収録。既存UNIQUEとトランザクションを利用 |
| notification_settings | 8列、InnoDB、PK user_id、usersへのFK | backup.sqlと一致。旧ダンプ・20260722 migrationにも定義あり | 今回の通知保存に必要な変更なし | 実DDLを収録。設定値やFKを変更しない |

参照用の [RDS定義スナップショット](../database/schema/notification_tables_rds_20260928.sql) を追加しました。
**これは既存RDSへ実行するmigrationではありません。** データ・認証情報・AUTO_INCREMENTの現在値は含みません。

users、admin_users、group_members、user_groupsのDDLも確認しました。
有効ユーザー、管理者権限、参加済みグループメンバーの検索に必要な列が存在します。
ユーザーのメール・password_hash・端末トークン等の実データは取得していません。

## 4. 修正内容

既存のワークツリー修正を維持し、RDSの観測結果に合わせてPushと時刻処理を修正しました。

| ファイル・関数 | 処理・変更 |
|---|---|
| api/Admin/handlers/post.php / handle_admin_post | お知らせ登録をnoticeCreateへ委譲し、commit後に通知イベントを依頼 |
| api/Admin/services/notices.php / noticeCreate | admin_notices・notifications・recipientsを同一トランザクションで保存。既存Repositoryを再利用 |
| 同 / noticeValidate | Push ONの拒否を廃止。ON/OFF両方で履歴を生成し、希望フラグを保持 |
| 同 / noticeRecipients | DBからactive・非削除ユーザーを取得。特定ユーザー・参加済みグループに限定可能 |
| 同 / noticeExpiryUtc | 日本時間の公開終了を通知本体のUTC期限へ換算 |
| 同 / noticePublishRealtime | 日本時間の公開期間をUTC_TIMESTAMP()+9時間で比較。commit後に既存realtime.phpを使用 |
| api/Admin/handlers/patch.php | 通知本文・期限を同時更新。編集時のPushフラグを保持し、期限をUTCへ変換 |
| api/Notifications/Service/NotificationRepository.php | 呼び出し元のトランザクションに参加。自分で開始した場合だけcommit/rollback |
| api/Notifications/Common.php | 一覧・詳細・未読数・既読操作の公開条件を共通化。管理者通知のUTC日時をAPIで明示 |
| api/Notifications/cli/publish_admin_notices.php | 公開済み・期限内・未送信の通知を再送。日本時間の公開判定を明示 |
| src/pages/Admin/Notices/NoticeForm.jsx | Pushは希望保存のみと案内。ONでもアプリ内通知を保存可能 |
| api/Notifications/tests/admin_notice_integration.php | Push両値、編集、未読初期値、UTC/JST境界を追加検証 |
| database/schema/notification_tables_rds_20260928.sql | RDSの既存4テーブル定義を参照用に追加 |

追加・変更した重要処理には日本語コメントを付けています。通知と無関係なCSS・画面は今回変更していません。
前回からのフロント更新・本人限定API等の全変更は [実装詳細](11-Admin-Notice-Implementation-20260928.md) に記録しています。

### Service / Repository / Pushの区別

NotificationServiceには設定判定やFCM送信の仕組みがありますが、管理者POSTは直接呼びません。
管理者通知は既存NotificationRepositoryのDB保存を再利用し、realtime.phpで再取得の合図を送ります。通知保存を二重実装していません。

push_enabledはブラウザPushの希望保存値であり、通知履歴を作る条件ではありません。
管理者通知からのFCM送信は未接続です。チェックONでもFCM送信済みとは表示せず、delivered_atも埋めません。

### 時刻の扱い

- admin_notices.start_at/end_at: 従来の日本時間入力を維持。
- 管理者通知のcreated_at、recipients.created_at: UTCで保存。
- 管理者通知のexpires_at: 日本時間のend_atをUTCへ変換。
- 公開判定: admin_noticesの日本時間とUTC_TIMESTAMP()+9時間を比較。
- 既存の他種類の通知の期限比較・レスポンス形式は変更しない。
- 全管理API・通知APIのDB時刻を一律に日本時間へ変える前回案は撤回。既存データの時刻自体は変更しない。

## 5. 実際の処理フロー

以下は**修正後のローカル実装**です。本番はまだ旧コードです。

```text
src/pages/Admin/Notices/NoticeForm.jsx / handleSubmit
  → src/services/admin/notices.js / createNotice
  → src/services/admin/client.js / createResource
  → POST api/Admin/index.php?resource=notices
  → noticeRequireAdmin（セッションとDBで管理者・権限を検証）
  → api/Admin/handlers/post.php / handle_admin_post
  → api/Admin/services/notices.php / noticeCreate
      → noticeValidate
      → BEGIN
      → admin_notices INSERT（request_key UNIQUEで再送を識別）
      → noticeRecipients（宛先をサーバーで決定）
      → NotificationRepository.createNotificationWithRecipients
          → notifications INSERT
          → notification_recipients INSERT
      → admin_notices.notification_idを更新
      → COMMIT（途中失敗はすべてROLLBACK）
  → noticePublishRealtime
      → api/Admin/services/realtime.php / sendRealtimeEvent
      → 既存AWS Socket.IOのHTTP emit先
      → user:<ID> / notification_created / {notificationId}
      → src/pages/UserRealtimeListener.jsx
      → 通知一覧・未読件数を本人限定APIから再取得
```

通知の種別はsystem / admin_notice、target_typeはsystem_notice、target_idはnotice_idです。
title/body/created_by/end_atから通知本体を作ります。action_path/detail_dataはNULLで、既存の通知詳細画面を利用します。
recipient初期値はis_read=0、read_at=NULL、delivered_at=NULLです。

未来公開でもDB履歴・宛先は先に保存し、公開前のAPI表示とユーザー向けイベントを抑制します。
AWS送信失敗はcommit後に扱い、通知履歴を失いません。CLIから再試行できます。
過去のお知らせの自動補完・再送はしません。

## 6. DB・動作確認結果

ローカルDockerの実PHP API・実MySQLを使う統合テストは **47項目PASS**。
配信先はHTTPスタブであり、本番AWS配信や実ブラウザ受信の成功を示すものではありません。

| 確認 | 配備中/RDS | 修正後ローカル |
|---|---|---|
| admin_notices保存 | PASS（notice_id=4の存在） | PASS |
| notifications生成 | FAIL（対応通知なし） | PASS（Push ON/OFF） |
| notification_recipients生成 | FAIL（対応宛先なし） | PASS |
| notification_settings | 定義確認PASS、動作未確認 | 今回設定動作は未確認 |
| 二重登録防止 | 本番動作未確認 | PASS |
| 未読・read_at・delivered_at初期値 | 新規宛先なし | PASS |
| 全ユーザー・特定ユーザー・グループ対象 | 本番動作未確認 | PASS |
| 本人限定の一覧・詳細・既読API | 本番動作未確認 | PASS |
| 公開前・開始後・終了後の表示 | 本番動作未確認 | PASS |
| JST入力・UTC接続での公開/期限判定 | 時刻設定だけ測定 | PASS |
| 送信先停止中のDB保存と再送 | 本番動作未確認 | PASS |
| お知らせ削除後の非表示 | 本番動作未確認 | PASS |

検証コマンド: `docker exec tabi-apache-1 php /var/www/html/TABI/api/Notifications/tests/admin_notice_integration.php`。
テストデータは専用作成者で限定して後片付けします。実RDSへテストINSERTはしていません。

- npm run build: PASS（既存の大きなchunk警告あり）
- 今回変更したJSXのESLint: PASS
- 今回変更したPHPの構文検査: PASS
- git diff --check: PASS
- 全体Lint: 前回確認時、変更外に既存40 errors / 10 warnings。全体PASSとはしていない。

### 読み取り確認SQL

今回の確認には以下のSQLを使用しました。実行時は接続DBとテーブルの存在を先に確認しています。
本文・秘密値・端末トークンを含むSELECT *は使用していません。

```sql
SELECT DATABASE();
SELECT @@global.time_zone, @@session.time_zone, @@system_time_zone, NOW(), UTC_TIMESTAMP();
SHOW TABLES LIKE '%notification%';
SHOW TABLES LIKE '%notice%';
SHOW TABLES LIKE '%push%';
SHOW CREATE TABLE admin_notices;
SHOW CREATE TABLE notifications;
SHOW CREATE TABLE notification_recipients;
SHOW CREATE TABLE notification_settings;
SELECT notice_id, title, target_type, status, start_at, end_at,
       push_enabled, created_by, created_at, updated_at, deleted_at
FROM admin_notices WHERE notice_id = 4;
SELECT notification_id, notification_type, notification_subtype, title,
       target_type, target_id, created_by, created_at, expires_at
FROM notifications ORDER BY notification_id DESC LIMIT 20;
SELECT recipient_id, notification_id, user_id, is_read, read_at, delivered_at, created_at
FROM notification_recipients ORDER BY recipient_id DESC LIMIT 50;
SELECT n.notification_id, n.notification_subtype, n.target_type, n.target_id,
       COUNT(r.recipient_id) AS recipient_count
FROM notifications n
LEFT JOIN notification_recipients r ON r.notification_id = n.notification_id
GROUP BY n.notification_id, n.notification_subtype, n.target_type, n.target_id
ORDER BY n.notification_id DESC LIMIT 20;
```

## 7. 提案するRDS変更と承認対象（未実行）

通知テーブル3つの再作成・ALTERは不要です。新実装の対象指定、通知との対応、再送の重複防止、送信再試行のため、admin_noticesにだけ4列を追加する案です。
[適用予定SQL](../database/migrations/20260928_link_admin_notice_notifications.sql) の内容は以下です。

```sql
ALTER TABLE admin_notices
    ADD COLUMN target_id bigint NULL COMMENT '特定ユーザーまたは特定グループのID',
    ADD COLUMN notification_id bigint NULL COMMENT '作成済みの通知本体ID',
    ADD COLUMN request_key varchar(64) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT '登録リクエストの重複防止キー',
    ADD COLUMN realtime_published_at datetime NULL COMMENT '公開時のWebSocket送信依頼が全件成功した日時',
    ADD UNIQUE KEY uq_admin_notice_notification (notification_id),
    ADD UNIQUE KEY uq_admin_notice_request (request_key),
    ADD KEY idx_admin_notice_publish (realtime_published_at, start_at),
    ADD CONSTRAINT fk_admin_notice_notification FOREIGN KEY (notification_id)
        REFERENCES notifications (notification_id) ON DELETE SET NULL;
```

対象はadmin_noticesのみです。既存4行の追加列はNULLとなり、既存本文・公開期間・Push値は変更しません。
新しい通知や宛先は作らず、notice_id=4を補完しません。通知IDのbigintはRDSの参照先と型・符号が一致しています。
DDL時にメタデータロックを取得するため、短時間の待機が生じる可能性があります。MySQL DDLは通常のROLLBACKでは戻せません。
同じALTERの再実行は不可です。承認後も実行直前に列・索引の存在を読み取り確認します。

### ロールバック

新コードによる書き込み前なら、次の逆DDLで旧構造へ戻せます。逆DDLも承認なく実行しません。

```sql
ALTER TABLE admin_notices
    DROP FOREIGN KEY fk_admin_notice_notification,
    DROP INDEX uq_admin_notice_notification,
    DROP INDEX uq_admin_notice_request,
    DROP INDEX idx_admin_notice_publish,
    DROP COLUMN target_id,
    DROP COLUMN notification_id,
    DROP COLUMN request_key,
    DROP COLUMN realtime_published_at;
```

新コードが通知を保存した後は、上記を実行すると対応情報・再送キー等を失います。
その場合はまず書き込みと公開CLIを止め、コードを戻して追加列・通知履歴を保持する方法を優先し、別途データ保全計画を確認します。
既存notifications/recipientsを削除するロールバックは行いません。

**読み取りの許可は変更の許可と分けるという依頼に従い、現在はこのALTERへの明示承認待ちです。**
DB変更だけでは本番の不具合は解消しません。フロント/APIの整合した配備が別途必要です。

## 8. 残課題

1. 上記ALTERの承認と適用。RDSへの変更は現時点でゼロ。
2. 通知関連コードの配備。本番は旧コードなので、修正済みと扱わない。新APIはrequestKeyを要求するためフロントも合わせて配備する。
3. 本番での対象を限定した新規テスト通知は、ユーザーの許可を得てから実施。notice_id=4の補完や全ユーザーへのテスト配信は未実行。
4. 既存AWS WebSocketへの実配信、ユーザーA/Bのブラウザ受信、未読件数、既読永続化のE2E。
5. 予約CLIの定期起動設定。CLI自体はローカルで検証済みだが、本番cronは未登録。
6. FCM送信の接続と実機試験。WebSocketと別項目。
7. 配備前に [環境・セキュリティ調査](12-Environment-and-WebSocket-Audit-20260928.md) に記録した、Loginの固定初期値とDB秘密値の一致を解消する。実値は記載しない。今回、無関係なLogin画面や認証情報の変更・ローテーションは行っていない。

環境変数の定義有無・使用ファイル・用途・状態の表、.env.local→userSocket→既存AWS接続先の追跡は [環境変数調査](12-Environment-and-WebSocket-Audit-20260928.md) を参照してください。
PHPはフロントの.env.localを読まず、PHP用env.php/realtime.phpやサーバー環境変数を参照します。
AWSサーバーのソースがリポジトリにないことを理由に、WebSocket未実装とは判断していません。
