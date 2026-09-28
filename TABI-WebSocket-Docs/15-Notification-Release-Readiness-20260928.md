# 通知機能の完成確認と本番切り替え準備（2026-09-28）

## 1. 現在の到達点と許可範囲

管理者からの保存、対象限定の通知・宛先生成、リアルタイム更新、未読数、既読化、実ページ再読み込み後の既読維持をローカル実ブラウザで確認しました。停止予告の曜日・時間・重複防止もPASSです。本番の切り替えはまだ実行しておらず、本番完成とは区別します。

最新依頼により、必要な非破壊RDS ALTERは許可済みです。以前の資料の「未承認」は当時の記録です。追加回答で「停止状況と限定テスト対象の確認後、本番切り替えも実施する」と明示許可を受けました。今回、限定テスト対象は **user_id=2**、公開CLIは **cron登録なし** とユーザーから確定回答を受領しました。管理API書き込み停止・検証用の正規ログイン準備など、実作業の安全条件を確認してからALTERと切り替えに進みます。

cron登録・変更・削除・有効化・無効化はすべてユーザー側の作業です。Codexから操作しません。

### 追加条件を統合した実行ゲート（以後の作業に優先）

- 限定本番テスト対象は、ユーザーが明示指定した **user_id=2の1名だけ** とします。対象を推測・変更しません。RDSのSELECTでも有効・未削除を確認済みです。管理者権限はないため、作成側は別の正規管理者セッションを使用します。
- 対象user_idと公開CLIのcron状態の両方が確定するまで、本番切り替えを開始しません。RDS ALTER、PHP/API切り替え、フロント切り替え、本番テスト通知、書き込み再開を実行しません。非破壊ALTERの既存許可より、この実行前提を優先します。
- cronが「稼働中」の場合は、ユーザー側で停止したことを確認してから切り替えます。「不明」を「登録なし」や「停止済み」として扱いません。
- 全ユーザー向けの本番テスト通知には別途明示許可が必要です。停止予告を含む公開CLIの通常実行をテストの代わりに行いません。DB非接続のdry-runと、本番通知を生成する通常実行を区別します。
- 指定ユーザーだけのrecipient作成・未読増加・WS受信、対象外ユーザーへの非配信、既読化、再読み込み後の維持、同じrequestKey再送での重複防止を限定テストで確認します。条件や受信観測手段が不足する項目は成功と断定しません。
- AWS LightsailへのSSH接続、ファイル変更、サービス再起動、設定変更には、それぞれを含む明示許可が必要です。接続先情報の提示や、ロリポップ側の切り替え許可をAWS操作の許可とは解釈しません。

## 2. 本番の再調査結果

共有SSH接続を再利用しました。2026-09-28 11:50 JSTのRDS確認はSELECTのみです。接続設定・認証情報はサーバー上の既存設定からメモリ内で使用し、値を出力していません。

| 項目 | 再確認結果 |
|---|---|
| `admin_notices` | 旧13列。追加4列なし。4行 |
| status | published 3行、ended 1行。publishedで統一済み |
| `notifications` | 1行 |
| `notification_recipients` | 1行 |
| 有効ユーザー | 8人。名前・メール・パスワード等は取得しない |
| RDSセッション時刻 | UTC |
| 本番PHP | 旧版のまま。`notices.php`・停止予告サービス・公開CLIは未配備 |
| 本番フロント | main-CppXno4J.js、index.esm-BTIZwCTM.js、main-C5VbrvfT.css |
| 通常API | `/TABI/api/Admin/index.php` |
| 重複API | `/TABI/api/api/Admin/index.php` が存在。新しい権限確認なし |
| .htaccess | `/TABI/` と `/TABI/api/` にそれぞれSPA Rewrite。Admin直下・重複api直下に独自.htaccessなし |
| cron | 登録なし。ユーザーがロリポップ管理画面で登録一覧なし・新規登録フォームのみを確認 |
| 重複APIの利用実態 | SSHから参照可能な候補ディレクトリにアクセスログを見つけられず、未確認 |

### user_id・cron確定後の追加照合

- user_id=2はactive・未削除。admin_users上の管理者権限なし。通知対象として利用可能で、権限の変更は不要です。
- 退避済み公開384ファイルに変更なし。stage-v2の配備予定39ファイルは全件マニフェストと一致。最終アーカイブのSHA-256も第9節の値と一致しました。
- 通知関連4テーブルは行数だけでなく、取得した全行の値をメモリ内で退避データと比較して一致しました。本文などの実データは出力していません。
- admin_noticesの追加4列は全て未作成、statusはpublished 3行／ended 1行のままです。
- 本番のログイン画面を用意しました。切り替え後にすぐ検証できるよう、作成権限を持つ管理者の正規ログインと、他の管理者・手動CLIが書き込まないテスト時間の確認を依頼しています。これはALTER・配備許可の再確認ではなく、限定テストを成立させるための操作準備です。
- この照合では本番ファイル、.htaccess、RDSデータ・定義、cron、AWS設定を変更していません。

元の不具合は、本番管理者POSTがadmin_noticesだけを保存し、通知Repositoryを呼んでいないことです。前回の修正を本番へ反映する必要があります。

## 3. 今回追加した修正と検証コード

実ブラウザ検証で、既読APIの送信元判定に不具合を確認しました。`Origin` から取り出したホストにはポートがなく、`HTTP_HOST` には開発用ポートが含まれるため、同じホストの正当なPATCHが403になっていました。

| ファイル | 今回の変更と理由 |
|---|---|
| `api/Notifications/Common.php` | 既読APIのHost比較をホスト名形式にそろえる。ポート付き開発URLでも同一ホストの操作が通るよう修正 |
| `api/Notifications/cli/publish_admin_notices.php` | 非公開準備領域での検証を受け、realtime.phpの読み込みを実処理開始まで遅延。dry-run／停止時間中に送信・ログ依存を読み込まない |
| `api/Notifications/tests/admin_notice_integration.php` | 同一ホストOrigin付き既読操作と、別サイトOriginの拒否を検証。47→48項目 |
| `api/Notifications/tests/browser_integration.mjs` | 新規。隔離Chromium＋実React＋実PHP＋ローカルDBで作成・一覧更新・既読・再読み込み・同一キー再送を確認 |
| `api/Notifications/tests/websocket_transport_integration.mjs` | 新規。明示的な `--live` 実行時だけ、既存PHP→AWS Socket.IO→検証用部屋の受信を確認 |
| `api/Notifications/tests/migration_preflight.php` | 新規。旧RDS構造の使い捨てローカルDBでALTERと旧形式INSERTの互換性を検証 |
| `api/Notifications/tests/maintenance_rewrite_test.py` | 新規。隔離Apacheで通常・重複経路、HTTPメソッド、SPA、停止解除、入口統一を検証 |
| `deployment/notifications/api.htaccess.maintenance` | 配備候補。通常・重複Adminの書き込みを503で停止し、旧URLを通常入口へ統一 |
| `deployment/notifications/api.htaccess.active` | 配備候補。停止ブロックを除去し、入口統一ルールを残す |
| `scripts/prepare_notification_release.py` | 新規。許可リストから配備アーカイブとSHA-256マニフェストを作る。接続・配備・SQL実行はしない |
| 本資料・README | 検証結果、配備物、移行・退避・cron・残課題を記録 |

ローカルのテスト用コンテナ・検証ユーザー・検証行・使い捨てDBは各テストの後片付けで除去しています。ブラウザ検証用のChromiumをローカルキャッシュへ導入しました。既存のブラウザプロファイルは使用していません。開発用固定ログイン情報、CSS、FCMの実装は変更していません。

## 4. API・DB・WebSocketの確認

管理者のPOSTはrequestKey、targetIdを受け取り、セッションとDB権限を確認します。admin_notices・notifications・notification_recipientsを1トランザクションで保存し、対象をサーバー側で選びます。新規宛先は未読・read_at NULLです。同一通知／ユーザーは既存UNIQUE、同一登録要求は新しいrequest_key UNIQUEで重複を防ぎます。

COMMIT後に `realtime.php` が `user:{id}` へ `notification_created` と通知IDだけを送ります。`UserRealtimeListener` が画面内イベントに変換し、一覧・未読件数APIを再取得します。ブラウザ内のイベント処理を通して、対象Aだけの表示と対象外Bへの非表示を検証しました。

### AWSへの実送信

実際の `https://ws.tabital.com` へSocket.IO接続し、PHPから既存emitへ依頼してHTTP 200を確認しました。実在しない検証用IDのA部屋に1回届き、別の検証用B部屋には届きませんでした。RDSの通知作成や実ユーザーへの送信はしていません。

この結果は通信経路と部屋ごとの振り分けの確認です。**認証情報なしの検証用IDでjoin_user・受信ができたため、AWS側で本人のユーザーIDへ限定する認可を確認する必要があります。** 他の実ユーザーの部屋への侵入テストは実施していません。AWSサーバーのソース所在を問い合わせ中で、認可の安全性は確認済みとしていません。

### ブラウザ検証と実通信検証の境界

ブラウザテストでは外部送信をHTTPスタブ、Socket.IO通信をブラウザ内のフレーム置換にしています。PHPの実際の送信先ルームに応じてフレームを配り、実UserRealtimeListenerを動かしています。新しいWebSocketサーバーは作っていません。

AWS実送信テストは別に実行しました。「本番RDS→本番AWS→本番ユーザー画面」の一続きのE2Eは、切り替え後の限定テストが残っています。

## 5. RDS停止30分前通知

正式スケジュールと通知仕様は[停止予告の実装資料](14-RDS-Shutdown-Warning-20260928.md)を維持しています。

| 曜日 | 稼働時間（JST） | 通知予定 |
|---|---|---|
| 月・水・木 | 08:30–20:00 | 19:30 |
| 金 | 08:30–12:30 | 12:00 |
| 火・土・日 | 終日停止 | なし |

設定元はserviceSchedule.phpの1か所。終了時刻から30分を引いて算出します。停止中はDB接続前に終了します。停止1分前から新しい保存・送信を始めません。日付キーとMySQLの名前付きロックで同日の重複を防ぎ、外部送信失敗後もDB履歴を残します。停止予告は重複回避を優先して自動再送せず、一覧APIから回復します。

## 6. テスト結果

| 検証 | 結果 |
|---|---|
| 管理者通知API統合 | 48 PASS |
| 停止予告・境界時刻・重複・DB非接続 | 41 PASS |
| 実ブラウザの管理画面→保存→一覧→既読→リロード | 8 PASS |
| 非破壊ALTERリハーサル | 4 PASS |
| Apache Rewrite・停止解除・重複入口統一 | 22 PASS |
| 既存AWSへのPHP送信と部屋別受信 | PASS、HTTP 200、対象1回／別部屋0回 |
| npm run build | PASS（既存の大きなchunk警告あり） |
| 通知関連JS/JSX・追加mjsのESLint | PASS |
| リポジトリ全体のnpm run lint | FAIL：既存40 errors／10 warnings。通知変更外のため修正対象に拡大しない |
| PHP構文検査・差分チェック | PASS |
| 本番の限定ユーザー通知 | 未実行 |
| 本番RDS ALTER・本番切り替え | 未実行 |

「全体Lint PASS」という引き継ぎ情報は再検証結果と一致しません。対象範囲のPASSと全体の既存エラーを区別しています。

ブラウザテストには `TABI_PLAYWRIGHT_MODULE` で使用するPlaywrightのモジュールパスを渡します。API統合テストはローカルDocker専用で、migration／停止予告テストの使い捨てDB作成にはローカル管理用権限が必要です。秘密値は標準入力やメモリ上の環境変数で受け渡し、コマンド本文や出力に書きません。

## 7. 配備物の確定

生成済み: `dist/notification-release/TABI-notifications.tar.gz`。`manifest.json` に配備先相対パス・サイズ・SHA-256、`SHA256SUMS` にアーカイブの検証値があります。

### PHP 15ファイル

| 配備先 | 役割・依存 |
|---|---|
| api/Admin/index.php | 認証と例外処理。bootstrap／noticesへ依存 |
| api/Admin/includes/bootstrap.php | noticesサービスの読み込み |
| api/Admin/handlers/post.php | お知らせと通知の同時保存を呼び出す |
| api/Admin/handlers/patch.php | お知らせ編集を通知本体へ反映 |
| api/Admin/repositories/admin_fetchers.php | targetId・notificationId等の返却 |
| api/Admin/services/realtime.php | 既存emit、テスト環境上書き、追加DBログ抑制 |
| api/Admin/services/notices.php | 入力・権限・宛先・トランザクション・公開処理 |
| api/Notifications/Common.php | 本人限定・公開条件・日時・送信元判定 |
| api/Notifications/List.php | 一覧・詳細の取得、Commonへ依存 |
| api/Notifications/MarkRead.php | 本人の通知を既読化 |
| api/Notifications/MarkAllRead.php | 現在表示可能な本人の通知だけ一括既読 |
| api/Notifications/Service/NotificationRepository.php | 通知・宛先保存、呼び出し元トランザクションと時間ガード |
| api/Notifications/Service/RdsShutdownWarning.php | 停止予告の作成・送信 |
| api/Notifications/cli/publish_admin_notices.php | 予約公開と停止予告の定期実行入口 |
| api/config/serviceSchedule.php | 正式な曜日・時刻と通知予定の計算 |

変更のないUnreadCount.php、NotificationService、notification_settings関連API等は配備物に含めていません。変更されたCommon／Repositoryを既存APIが利用します。DB認証・realtime秘密設定、vendor、テスト、cron設定はpayloadに含めていません。

### フロント

変更ソースは次の8ファイルです。

- src/pages/Admin/Notices/NoticeForm.jsx：requestKey生成・送信、targetId、新規作成／編集
- src/api/notificationApi.js：通知API呼び出し
- src/api/useUnreadNotificationBadge.js：未読数同期
- src/pages/MyPage/MyPage.jsx：未読バッジ利用
- src/pages/Notifications/NotificationListPage.jsx：通知一覧・既読・再取得
- src/pages/Notifications/NotificationDetailPage.jsx：詳細・既読・再読み込み
- src/pages/UserRealtimeListener.jsx：本人用イベントと再接続後の回復
- src/pages/userSocket.js：既存Socket.IO接続

配備するのはソースではなく、新index.htmlとdist/assets内のハッシュ付きファイルです。合計24ファイル。index.htmlはmain-COxki_tB.js、index.esm-hNB43mnu.js、main-Dj9O1BrQ.cssを参照します。新assetを先に置き、index.htmlを最後に切り替えます。旧ハッシュassetは削除しません。今回変更していないFCM Service Workerは配備物から除外しました。

### .htaccess候補

`review/` にSQLと2つの.htaccess候補を同梱しています。payloadとは別で、無条件に上書きする対象ではありません。

候補の配置先は `/TABI/api/.htaccess` です。`/TABI/.htaccess` は変更不要です。書き込み停止ブロックはRewriteEngine／RewriteBaseの直後、実在ファイル通過とSPAフォールバックより前に置きます。

```apache
RewriteCond %{REQUEST_METHOD} !^(GET|HEAD|OPTIONS)$
RewriteRule ^(?:api/)?Admin(?:/|$) - [R=503,L]
```

通常・重複経路のPOST／PATCH／PUT／DELETEを503にし、GET／HEAD／OPTIONSはこのルールを通過します。その後のAPI認証・メソッド制限は別に適用されます。ユーザー向けAPIとSPAは停止対象外です。解除時はBEGIN／ENDコメントを含む停止ブロックだけを除去します。

重複経路は利用実態未確認のため旧ファイルを削除しません。再開後も古い保存処理を迂回経路にしないよう、旧URLを新しい通常入口へ内部Rewriteする案です。index.phpのPATH_INFO付きも含めローカルApacheで確認しました。本番はApache互換設定・mod_rewrite／ENDフラグを含め反映直後の確認が必要です。

## 8. RDS ALTERと確認

実行予定は既存の `database/migrations/20260928_link_admin_notice_notifications.sql` の1文です。新しいDDLは増やしていません。

| 追加列 | 型 | NULL | DEFAULT | 用途 |
|---|---|---|---|---|
| target_id | bigint | 可 | NULL | 特定ユーザー／グループの識別 |
| notification_id | bigint | 可 | NULL | 通知本体への対応 |
| request_key | varchar(64)、ascii_bin | 可 | NULL | 登録要求の重複防止 |
| realtime_published_at | datetime | 可 | NULL | 送信依頼の完了時刻（UTC） |

notification_idとrequest_keyに各UNIQUE、公開処理用索引、notificationsへのON DELETE SET NULL外部キーを追加します。既存行は4列ともNULL。既存の通知・宛先の補完や再配信はしません。

ローカルでは旧13列の全値が保持され、旧API形式のINSERTが成功することを確認しました。ただし旧フロント＋新PHPはrequestKey欠落で422になるため、書き込み停止中の一括切り替えを維持します。

本番実行直前はSHOW CREATE TABLEと追加列不在を再確認し、テーブル待ちが長い場合は実行を見合わせます。DDLは通常のトランザクションROLLBACKでは戻せません。

実行後の確認SQL（現在は未実行）：

```sql
SHOW CREATE TABLE admin_notices;
SHOW INDEX FROM admin_notices;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_notices'
  AND COLUMN_NAME IN ('target_id','notification_id','request_key','realtime_published_at');
SELECT COUNT(*) AS total,
       SUM(target_id IS NULL AND notification_id IS NULL
           AND request_key IS NULL AND realtime_published_at IS NULL) AS untouched
FROM admin_notices;
SELECT status, COUNT(*) FROM admin_notices GROUP BY status;
```

ロールバック時も4列と追加索引・制約を原則残します。列削除は破壊的変更になるため今回の自動復旧には含めません。削除が必要になった場合は、その時点の参照状況・SQL・影響を提示して停止します。

## 9. 旧版退避と切り替え順

退避先は `/home/users/1/mond.jp-genshin/backups/TABI/20260928T030746Z/`。切り替え許可後、Web公開ディレクトリ外へ作成しました。umask 077でディレクトリ700・ファイル600として扱います。

`previous-files.tar.gz` と `previous-manifest.json` に既存384ファイルを退避しました。通知関連4テーブルは読取トランザクションで取得し、`notification-db-before.json` と `notification-schema-before.sql` に非公開保存しました。行数はadmin_notices 4、notifications 1、notification_recipients 1、notification_settings 1。ユーザー資格情報テーブルは取得していません。配備物も同じ非公開領域へ転送し、公開中のファイルにはまだ反映していません。

使用する最終配備物は非公開領域の `release-v2.tar.gz`、展開先は `stage-v2/` です。初回の `release.tar.gz`／`stage/` は切り替えに使いません。最終版のSHA-256は `42dab650199583bbf631bda957d2a7f72b381d2840fdefd829e4c8ab8dc75abc`。サーバー側でも39ファイルのハッシュ、PHP15ファイルの構文、DB非接続dry-runを確認し、`staging-verification.json` に記録しました。退避時点から公開側384ファイルに変更がないことも照合済みです。

退避対象は現在の `api/Admin/`、`api/Notifications/`、`api/config/serviceSchedule.php`、`index.html`、`assets/`、`.htaccess`、`api/.htaccess`、および比較用の重複 `api/api/Admin/`。元ファイルの有無とSHA-256も記録し、新規追加ファイルと上書きファイルを区別します。既存秘密設定は配備で上書きしません。

実行前提：ユーザーが指定した限定テスト対象user_idとcron状態を、最初に確定します。未確定なら以下の本番切り替えを開始しません。公開外の退避・準備は前回までの実施済み作業です。

1. 配備物のマニフェストと本番差分を再照合し、旧版を公開外へ退避する。RDSの現定義・行数も再確認する。
2. ユーザー側で既存予約CLI／cronを停止し、停止済みを確認する。登録なしならその旨を確認する。cronを止める前にHTTPだけ止めてもCLIは動くため、停止確認を切り替えの前提にする。
3. api/.htaccessをmaintenance候補へ切り替え、通常・重複経路の書き込み503と読み取り通過を確認する。失敗なら直ちに元の.htaccessへ戻す。
4. 許可済みの非破壊ALTERを1回だけ実行する。既に追加済みなら再実行しない。
5. 上記SQLで列・型・索引・FK・既存行維持を確認する。
6. 依存PHPから配置し、入口を最後に切り替える。アップロード途中のファイルを実行させず、同じディレクトリの一時ファイルからrenameする。非公開準備領域の600をそのまま引き継がず、公開PHP／assetは644、必要な公開ディレクトリは755にする。既存秘密設定の権限は変更しない。
7. 新assetを追加配置し、index.htmlを最後に切り替える。旧assetは保持する。
8. 管理画面を完全再読み込みし、一覧、targetId、requestKey送信、ユーザーの一覧／未読数を確認する。
9. 限定テスト対象user_idと実行者の管理セッションを確認する。停止ルールはテストPOSTも遮断するため、このままではテストできない。
10. 事前に定めた保守時間帯に他の管理者の書き込み停止を維持したうえで、active候補へ切り替えて限定テストを1件だけ行う。排他的なテスト時間を確保できない場合は、認証済みテスト経路の一時例外を別途具体化するまで再開しない。
11. 対象だけへの宛先、WS受信、未読増加、既読、リロード後の維持、同一キー再送を確認する。問題があればmaintenanceへ戻して復旧する。
12. 成功後、管理者へ通常書き込み再開を案内する。
13. ユーザー側でcronを1件だけ設定・再開し、実行結果を確認する。手動の公開CLI実行は全員向け停止予告が発生し得るため、時刻と対象を確認せずに実行しない。

### ロールバック

- ALTER後・コード切り替え前：旧コードのまま。4列は残し、問題がなければ停止を解除する。過去通知の補完は不要。
- 新コード後・テスト保存前：cron停止・HTTP書き込み停止を維持し、旧PHPと旧index.html、元の.htaccessを退避から戻す。追加列と新assetは残せる。新規PHPは旧コードから呼ばれないことを確認する。
- 新コードで通知保存後：まず書き込みとcronを停止。通知・宛先・既読状態・request_keyを削除しない。旧通知APIでは新しい公開条件を守れない場合があるため、通知読取・既読APIは新しい互換版を維持し、必要な管理者側だけを戻す。完全な旧版復帰は保存済み通知の公開状態を確認してから別途判断する。

## 10. ユーザー側のcron設定

| 項目 | 内容 |
|---|---|
| 対象PHP | `/home/users/1/mond.jp-genshin/web/TABI/api/Notifications/cli/publish_admin_notices.php` |
| 実行コマンド | `APP_ENV=aws /usr/local/bin/php8.3 /home/users/1/mond.jp-genshin/web/TABI/api/Notifications/cli/publish_admin_notices.php` |
| 推奨間隔 | 全曜日・終日、毎分1件。プラン制限が5分なら0/5/…/55分 |
| 実行ユーザー | 対象ロリポップ契約の実行アカウント。SSHではmond.jp-genshin。実際のcron OSユーザー／UIDは管理画面で要確認 |
| 設定操作 | ユーザーが実施。Codexから登録・変更・有効化等はしない |
| ログ | Web公開外。値を出さないJSON結果を記録し、ローテーションを設定 |
| 注意点 | 同じCLIを複数登録しない。CLI SAPI／PHP8.3での起動、APP_ENV、依存ファイル、設定の読取権限を確認 |

契約ごとの最小間隔とPHPの実行方式は[公式cronマニュアル](https://lolipop.jp/manual/user/cron/)および前資料を参照してください。管理画面のファイルパス欄は上記のシェルコマンドを貼る欄ではありません。PHP直指定でCGI版になる場合は、このCLIの実行条件を満たしません。既存の起動スクリプトを優先し、必要な場合は前資料の薄いシェル起動案を使います。

## 11. 本番完了までに残る確認

1. 限定本番テスト対象user_id=2・cron登録なしは確定済み。正規管理者セッションと受信側セッション、他の管理者・手動CLIを止めたテスト時間を確保する。
2. 本番ファイル切り替えは許可済み。退避との再照合・書き込み停止を完了してから公開側を切り替える。
3. AWS WebSocketソースの所在と本人ルーム認可。追加情報でLightsailの対象インスタンスは特定されたが、実機・コード・認証方式は未確認。SSH調査を含むAWS側操作は明示許可後に行う。
4. 許可範囲と前提が揃った後の退避、停止、ALTER、切り替え、限定本番E2E。
5. ユーザー側のcron設定と実時刻の停止予告確認。

本番データのINSERT／UPDATE／DELETE、ALTER、本番公開ファイルの変更、cron変更はこの時点で行っていません。Web公開外への退避・配備物の準備、実AWSへの検証用部屋のイベント送信、本番の読み取り調査は実施済みです。

## 12. 追加条件に基づく切り替え前報告

### 限定テスト

| 項目 | 現在の状態 |
|---|---|
| 対象user_id | 2 |
| 指定済み／未指定 | 指定済み。ユーザーが明示指定。RDSでactive・未削除を確認 |
| 本番通知送信 | 未実行。全ユーザー向けテストも別途許可がない限り禁止 |

user_id=2には管理者権限がないため、作成側の管理者ログインと受信側のログインを分けます。アカウント権限の変更や本番セッションの偽造は行いません。

### cron

| 項目 | 現在確認できている内容 |
|---|---|
| publish_admin_notices.php | 登録なし |
| 実行間隔 | 該当なし（未登録） |
| 実行ユーザー | 該当なし（未登録） |
| 実行コマンド | 該当なし（未登録）。第10節は今後の設定案 |
| ログ出力先 | 該当なし（未登録） |
| 重複登録 | なし（登録済みcronなし、ユーザー確認） |
| 備考 | ユーザーがロリポップ管理画面で確認。SSHからのcron一覧確認とは区別する。手動CLI実行は別途停止を確認する |

登録、停止、再開、削除はユーザーが行います。この追加条件の対応中にcron設定は変更していません。

### AWS WebSocket

以下のインスタンス情報はユーザー提供情報です。CodexがAWS管理画面や実機から再確認した結果ではありません。

| 項目 | 提供情報／確認状態 |
|---|---|
| サービス | Amazon Lightsail |
| インスタンス | tabi-ws-server |
| OS | Ubuntu |
| リージョン／AZ | ap-northeast-1／ap-northeast-1a |
| 状態 | Running（ユーザー提供情報） |
| Static IP | 57.180.211.158 |
| Private IPv4 | 172.26.15.95 |
| Lightsail tabi-ws-serverの実機確認 | 未確認。接続先情報は受領済み |
| AWS側ソース | 未確認 |
| 認証方式 | 未確認。PHPのemit依頼はBearer形式だが、サーバー側の検証実装と利用者の本人認証は未確認 |
| room管理 | クライアントはjoin_userとuser:{id}を使用。検証用部屋への振り分けは確認済み、参加権限の検証は未確認 |
| 通知イベント | notification_created。既存AWS経由で検証用部屋への受信を前回確認済み |
| 問題点 | 認証情報なしの検証IDでも入室・受信できた。本人のuser_idだけに参加できる認可の確認が必要。実ユーザーの別人ルームへの侵入テストはしていない |

明示許可後の読み取り調査対象は、Node.js／Socket.IOの起動元、PM2／systemd／Docker、Nginx、ws.tabital.comの対応、path／namespace、join_user、room判定、通知イベント、HTTP emit入口、認証処理、ログ保存先です。秘密値・トークン・ログ本文を無差別に出力しません。読み取りSSHの許可だけでファイル変更・再起動・設定変更へ進めません。
