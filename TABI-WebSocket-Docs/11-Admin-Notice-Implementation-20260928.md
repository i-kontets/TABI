# 管理者お知らせ → ユーザー通知：調査・実装結果

調査日: 2026-09-28。対象: このリポジトリとローカルDockerのMySQL。

追記: [RDS実測と最新の修正結果](13-Notification-DB-RDS-Precheck-20260928.md) で配備差分と実DDLを確認しました。本番変更・配備は未実行です。

## 結論と確認範囲

管理画面から既存通知テーブルへ保存する接続、宛先判定、管理者認証、公開期間、ユーザー画面の再取得を追加しました。
2ユーザーの実PHP API・MySQLテストは、RDS調査後の追加分を含め47項目PASSです。送信先停止からの回復も確認しました。
ただし送信先はテスト専用HTTPスタブです。実WebSocketサーバーと2ブラウザを通した完成判定は**未確認**です。

WebSocketサーバーはAWS上に存在するとの追加情報を受領しました。サーバーのソースがこのリポジトリにないことは、WebSocket未実装を意味しません。追加調査で既存接続先への実Socket.IO接続にも成功しました。既存サーバーとの重複を避け、新しいSocket.IOサーバーは作っていません。
既存の `join_user(userId)` だけでは本人確認になりません。サーバー側でセッション等を検証しているか不明なので、**安全なWebSocket認証が実装済みとは判定しません**。
サーバー側のルーム認可と実ブラウザ通知を確認できるまでは「WebSocket管理者通知の基本完成」とは扱いません。環境変数・実接続・秘密情報の追加調査は [設定経路の調査](12-Environment-and-WebSocket-Audit-20260928.md) を参照してください。

## 1. 調査時点の進捗表

| 機能 | 調査時点 | 関連ファイル | 問題／今回の対応 |
|---|---|---|---|
| 管理者お知らせ作成画面 | 一部 | `src/pages/Admin/Notices/NoticeForm.jsx` | 実ルートから呼ばれる。確認・送信ロック・対象ID入力が不足 → 追加 |
| お知らせ登録API | 一部 | `api/Admin/handlers/post.php` | `admin_notices` だけ保存、作成者が固定1、API認証なし → 修正 |
| 通知DB保存 | 一部 | `NotificationRepository.php`, `NotificationService.php` | 共通処理はCLIから呼ばれるが、お知らせAPIから未接続 → Repositoryを再利用 |
| 通知対象ユーザー作成 | 未実装（管理者お知らせ） | 同上 | サーバーで確定して `notification_recipients` に保存する処理を追加 |
| WebSocket接続 | 一部（初回調査時点） | `userSocket.js`, `UserRealtimeListener.jsx` | `App.jsx` から呼ばれる。追加調査ではAWS上の既存接続先にWSS接続成功。サーバーソースはリポジトリ外 |
| WebSocket認証 | 未確認／要対応 | `UserRealtimeListener.jsx` | HTTP whoami後にIDだけをjoin_user送信。サーバーの認証証拠なし |
| WebSocket送信 | 一部 | `api/Admin/services/realtime.php` | `/emit` 呼び出しあり。お知らせはadmin:globalだけ → userルーム宛の送信依頼追加 |
| ユーザー側受信 | 一部 | `UserRealtimeListener.jsx` | `notification_created` をブラウザイベントへ変換済み、通知画面側に購読なし → 接続 |
| 通知一覧 | 実装済（初期取得） | `NotificationListPage.jsx`, `List.php` | ルート登録済み、本人のDB履歴を取得。リアルタイム再取得を追加 |
| 未読件数 | 実装済（初期取得・既読後） | `useUnreadNotificationBadge.js`, `UnreadCount.php` | 新規受信では更新されなかった → 購読追加 |
| 既読化 | 実装済／一部 | `MarkRead.php`, `MarkAllRead.php` | 本人限定。公開前判定不足 → 共通公開条件追加 |
| 再接続 | 一部 | `userSocket.js` | Socket.IO標準任せ、接続後の履歴回復なし → 上限30秒・再取得追加 |
| 公開期間制御 | 一部 | `admin_notices`, `Common.php` | 保存のみ、通知APIはexpires_atのみ → 公開開始・終了・削除状態も参照 |
| Push/FCM | 一部 | `src/firebase/*`, `api/Notifications/Fcm/*` | SW・VAPID・端末登録・PHP送信処理は存在。お知らせ作成からFCMへは未接続 |

調査時点の接続は `NoticeForm → createNotice → Admin/index.php → admin_notices → admin:global の更新通知` まででした。
ユーザーの `List.php → notifications / notification_recipients` は別の流れで、この間がつながっていませんでした。
既存の古いFCM調査文書にある「通知ルート未登録」は、現在の `App.jsx` には当てはまりません。

## 2. 既存実装を利用した理由

- 通知本体と受信者は、既存の `NotificationRepository` とテーブルを再利用しました。
- 一覧・未読・既読のAPIとCSSは維持し、公開条件と更新イベントを追加しました。
- WebSocketは通知の内容そのものの保存場所にはしません。受信時は本人限定APIを取り直します。
- 同じイベントを二度受けても、DBの一覧と件数に置き換えるため二重加算されません。
- `delivered_at` は既存の「FCM送信成功日時」という意味を維持し、WebSocket送信成功で変更しません。

## 3. 関連ファイルと変更内容

以下のパスはリポジトリルートからの相対パスです。

| ファイル | 役割 | 変更内容 |
|---|---|---|
| `src/pages/Admin/Notices/NoticeForm.jsx` | お知らせ入力 | 対象ID、確認ダイアログ、上限、エラー、送信ロック、再送キー、Push未対応の案内 |
| `src/pages/Admin/AdminRoutes.jsx` | ルーティング | 既存 `/admin/notices/new` / 編集ルートを確認。変更なし |
| `src/services/admin/notices.js` / `client.js` | 管理API呼び出し | 既存処理をそのまま使用 |
| `api/Admin/index.php` | 管理API入口 | セッション＋DB権限チェック、例外詳細の公開停止 |
| `api/Admin/includes/bootstrap.php` | 読み込み | お知らせサービスを読み込む |
| `api/Admin/services/notices.php` | 新規の接続処理 | 入力検証、認証、宛先確定、原子的保存、再送、公開時の送信依頼 |
| `api/Admin/handlers/post.php` | 登録 | 固定作成者を廃止。上記サービスへ接続 |
| `api/Admin/handlers/patch.php` | 編集 | 通知本体も同時更新。通知作成後の宛先・開始時刻変更を拒否 |
| `api/Admin/repositories/admin_fetchers.php` | 管理一覧／詳細 | 対象IDと通知IDを返す |
| `api/Admin/services/realtime.php` | 既存HTTP送信 | 環境変数で送信先を上書き可能にし、検証時の本番誤送信を防ぐ |
| `api/Notifications/Service/NotificationRepository.php` | 既存DB保存 | 呼び出し元のトランザクションに参加可能にする |
| `api/Notifications/Common.php` | 共通SQL | 公開条件、日本時間、本人限定取得を共通化 |
| `api/Notifications/List.php` | 一覧／詳細API | 公開条件、recipientIdによる詳細1件取得 |
| `api/Notifications/MarkRead.php` | 単一既読 | 更新SQL自体にも公開条件を適用 |
| `api/Notifications/MarkAllRead.php` | 一括既読 | 予約・終了・削除通知を除外 |
| `api/Notifications/cli/publish_admin_notices.php` | 新規CLI | 期限到来分・送信失敗分を最大100件ずつ処理 |
| `src/api/notificationApi.js` | 通知クライアント | 詳細再取得用recipientIdを渡す |
| `src/api/useUnreadNotificationBadge.js` | ベル | 新規受信・再接続・フォーカス復帰・60秒ごとに再取得 |
| `src/pages/Notifications/NotificationListPage.jsx` | 通知一覧 | イベント再取得、重複表示防止、古い追加ページの破棄 |
| `src/pages/Notifications/NotificationDetailPage.jsx` | 詳細 | 履歴stateに依存せずDBから復元し、開いた通知を既読にする |
| `src/pages/UserRealtimeListener.jsx` | 既存受信係 | 再接続合図、ログイン画面で切断、別タブのアカウント変更時切断、古い認証応答の破棄 |
| `src/pages/userSocket.js` | 既存Socket.IO接続 | 1秒開始・最大30秒のバックオフを明示 |
| `src/pages/MyPage/MyPage.jsx` | ログアウト | loginUserキャッシュを削除し、他タブにも切断を知らせる。APIパスの大小文字を修正 |
| `database/migrations/20260928_link_admin_notice_notifications.sql` | 追加SQL | お知らせへ4列・3索引・外部キーを追加 |
| `api/Notifications/tests/admin_notice_integration.php` | 実API・DBテスト | ローカルDocker専用の47項目検証、作成したテストデータを後片付け |
| `api/Notifications/tests/emit_stub.php` | テスト受け口 | HTTP送信依頼先を記録。実WebSocketサーバーではない |

管理者認証はお知らせだけでなく管理API入口に適用しました。管理者作成APIが無認証のままだと、権限を自分で追加してお知らせの認証を迂回できるためです。既存の権限ラベルに合わせ、閲覧はlevel 1以上、変更はlevel 5以上です。一般ユーザーのログインセッションから管理APIは利用できません。

## 4. DBの確認とSQL

`tabi-apache-1` からDockerサービス `db` の `tabi` へ接続し、存在確認後に `SHOW CREATE TABLE` と行数を読みました。本番DBには接続・適用していません。
調査段階ではデータ変更SQLを実行していません。本文・パスワード・端末トークンは検証報告に含めません。

| テーブル | 実際に使う主要カラム | 確認内容 |
|---|---|---|
| `admin_notices` | notice_id, title, body, target_type, status, start_at, end_at, push_enabled, created_by, deleted_at | 元は3行。通知との参照列がなかった |
| `notifications` | notification_id, notification_type, notification_subtype, title, body, target_type, target_id, action_path, detail_data, created_by, created_at, expires_at | 元は1行。titleは150文字、created_byはusersへの外部キー |
| `notification_recipients` | recipient_id, notification_id, user_id, is_read, read_at, delivered_at, created_at | 元は1行。notification_id＋user_idにUNIQUE、両IDに外部キー、ユーザー・未読用索引あり |
| `users` | user_id, status, deleted_at | 対象はactiveかつ未削除。元は8行 |
| `admin_users` | user_id, admin_level | 作成者の権限をDBで照合 |
| `group_members` / `user_groups` | group_id, user_id, invitation_status / status | activeグループのacceptedメンバーだけを対象にする |
| `notification_settings` / `user_devices` | 設定各列 / user_id, token_hash, is_active等 | 存在・構造確認済み。今回はFCM送信に接続しない |

追加SQLは `database/migrations/20260928_link_admin_notice_notifications.sql` です。

- `target_id`: 特定ユーザー／グループの選択値。本人認証に使うIDではありません。
- `notification_id`: 既存通知本体への一意の参照、外部キーあり。
- `request_key`: 同じ登録リクエストの再送を1件にする一意キー。
- `realtime_published_at`: 全宛先へのHTTP送信依頼に成功した日時。端末受信保証ではありません。

**ローカルDB: 実行済み。本番DB: 未実行。** 既存列やデータは削除・置換しません。既存行の追加列はNULLのままです。既存のお知らせを遡って通知化・配信しません。
SQLは1回だけ適用します。すでに列がある環境では再実行しないでください。通知API／管理APIを配備する前に適用が必要です。
日時入力は日本時間です。RDS調査後、管理者通知の作成時刻・期限はUTCとし、公開期間との比較を明示的に時差換算する方式へ修正しました。全管理API・通知APIを一律に `+09:00` にする処理は撤回しています。旧データの日時自体は変換していません。

テスト後、users=8、admin_notices=3、notifications=1、notification_recipients=1に戻ることを確認しました。採番値はテストで進みます。

## 5. API

| API（`/TABI/api/` 以下） | Method | 用途 |
|---|---|---|
| `Admin/index.php?resource=notices` | POST | 管理者のお知らせ・通知・宛先を一括保存 |
| `Admin/index.php?resource=notices&id=n<ID>` | GET / PATCH / DELETE | 管理者のお知らせ取得・編集・論理削除 |
| `Notifications/List.php` | GET | 自分の公開中通知一覧 |
| `Notifications/List.php?recipientId=<ID>&limit=1` | GET | 自分の通知詳細（既存一覧APIを拡張） |
| `Notifications/UnreadCount.php` | GET | 自分の公開中未読数 |
| `Notifications/MarkRead.php?recipientId=<ID>` | PATCH | 自分の通知を既読化 |
| `Notifications/MarkAllRead.php` | PATCH | 自分の公開中通知を一括既読化 |
| `auth/whoami.php` | GET | 既存ログインセッションの確認 |

通知詳細URLの `:notificationId` は既存UIの命名ですが、実際には **recipientId** です。この対応を維持しています。

登録はtitle（150文字）、body（1000文字）、target、targetId、startAt、endAt、push（boolean）、requestKeyを検証します。
作成者のuser_id/admin_idをリクエストに追加しても使いません。認証済みセッションが作成者です。
対象者は登録時点で確定し、予約中に新たに加入したユーザーへ自動追加しません。編集で対象や開始時刻を変える場合は、新規お知らせを作成してください。
新規作成対象の通知本文はReactのテキストとして描画し、HTMLとして実行しません。

## 6. WebSocket

接続は `socket.io-client`、`transports: ['websocket']`、URLは `VITE_SOCKET_URL` またはコードの既定値です。HTTPS URLはSocket.IOがWSS接続に変換します。追加調査でNodeクライアントからWSS接続成功を確認しました。実ブラウザOriginでの動作・プロキシ内部構成は未確認です。
PHPの送信先は `REALTIME_EMIT_URL`／既存ローカル設定／既定の `https://ws.tabital.com/emit` の順で決まります。共有秘密はサーバー側だけで読みます。

```json
{
  "room": "user:123",
  "event": "notification_created",
  "data": { "notificationId": 456 }
}
```

これはPHP→配信サーバーのHTTP本文の例です。既存イベント名を維持し、新しい `notification.created` イベントは増やしません。
受信時は `window` の `user:notification_created` に変換し、一覧とベルが本人用APIを再取得します。

| 項目 | 確認結果 |
|---|---|
| サーバー本体・起動コマンド・内部ポート | AWS上に存在（ユーザー情報）。外部443番への接続成功。ソース・内部ポート・起動方法は未確認。Docker compose内にないことを未実装の根拠にはしない |
| 接続時認証 | 未確認。現在のHTTP whoami＋join_user(ID)を認証済み設計とは扱わない |
| ユーザー別送信依頼 | 実装・HTTPスタブでA/Bの送信先分離を確認 |
| 複数タブ／複数端末のサーバー接続管理 | 未確認。userルーム内の全socketに送る実装が必要 |
| onopen相当 | Socket.IOのconnect、セッション確認、再取得イベント |
| onmessage相当 | notification_created購読とブラウザイベントへの変換 |
| onclose / onerror相当 | Socket.IO標準の切断検出・再接続に委譲。サーバー拒否時の挙動は未確認 |
| 再接続 | 1秒開始、指数バックオフ、上限30秒、揺らぎ0.5。接続後はDBから回復 |
| ping/pong、切断接続の削除 | Socket.IOライブラリが扱う領域。サーバー設定・実動作は未確認 |
| ログアウト | 当該画面と別タブのクライアント切断を追加。サーバー側のセッション失効連動は未確認 |

既存サーバーで次の確認・修正が必要です。

1. セッション、またはPHPがセッションから発行する短命の署名トークンで接続を認証する。
2. クライアントが自由に指定したIDを信用せず、サーバーが確定したユーザーのルームだけへ入室させる。
3. join_user / join_trip / 管理者ルームの既存処理に同じ権限検証を適用する。
4. `/emit` の共有秘密を検証し、外部クライアントからの任意broadcastを拒否する。
5. 複数socket、ログアウト失効、ping/pong、切断後の削除を2ブラウザで確認する。

本文をWebSocketに載せないことは被害範囲を小さくする対策であり、サーバー認証の代わりにはなりません。

## 7. 実際の処理順

```text
NoticeForm.handleSubmit
  → createNotice（src/services/admin/notices.js）
  → Admin/index.php → noticeRequireAdmin
  → handle_admin_post → noticeCreate
      → noticeValidate（文字数・対象・日付・push）
      → トランザクション開始／重複キー確認
      → admin_notices INSERT
      → noticeRecipients（users / group_members / user_groups）
      → NotificationRepository.createNotificationWithRecipients
      → notifications + notification_recipients INSERT
      → admin_notices.notification_id を保存 → commit
  → noticePublishRealtime（公開期間をDBで確認）
      → sendRealtimeEvent(user:<ID>, notification_created, {notificationId})
  → 既存WebSocketサーバー（本体と認証は未確認）
  → UserRealtimeListener
  → user:notification_created
  → NotificationListPage / useUnreadNotificationBadge
  → List.php / UnreadCount.php → 本人のDB状態で再描画
  → クリック → MarkRead.php → read_at保存 → 詳細表示
```

未来日時も本体と宛先を保存しますが、APIは公開時刻前の取得・既読を拒否し、登録時のユーザー向け送信も行いません。
公開開始の送信と失敗再送は次のCLIで行います。

```bash
php api/Notifications/cli/publish_admin_notices.php
```

毎分実行するcron等への登録は**未実施**です。既存の通知用スケジューラーは見つかりませんでした。
CLIを起動しなくても開始時刻後のAPI再取得では表示されますが、予約の即時イベント配信には定期起動が必要です。
名前付きDBロックでCLIの重複起動を避け、送信成功印のない公開中通知を再試行します。送信後にプロセスが落ちた場合などは再送され得ますが、ReactはDBから再取得するので一覧は重複しません。
大量の全ユーザー通知は現在HTTP送信が逐次処理です。対象数が多い環境では既存配信基盤と接続して負荷・タイムアウトを検証する必要があります。

## 8. Pushチェックボックス

調査時点では、値は `admin_notices.push_enabled` に保存されるだけで、**管理者お知らせからPush送信する機能としては見た目と保存のみ**でした。
プロジェクト全体ではFirebase Messaging、Service Worker、VAPIDによるトークン取得、端末登録API、PHP FCM送信サービスが存在します。すべて未実装という意味ではありません。

今回はWebSocket経路を優先し、FCMは新規実装していません。RDS調査後、チェックON/OFFの両方でアプリ内通知を保存し、Pushの希望フラグを保持するよう修正しました。画面には希望の保存のみで、実Push送信は未対応と表示します。
チェックOFFでもWebSocket更新は行います。ブラウザを閉じた状態のPush配信は保証しません。

## 9. 動作確認結果

| 項目 | 結果 | 実行範囲 |
|---|---|---|
| ローカル実DB構造 | PASS | 存在、列、UNIQUE、FK、索引を読み取り確認 |
| API・DB統合47項目 | PASS | 専用セッションのA/B・管理者・閲覧者、実PHP HTTP API、実MySQL。PushとUTC/JST検証を追加 |
| 送信対象分離 | PASS | HTTP emitスタブで特定ユーザー／グループはAだけへの送信依頼 |
| 未ログイン・一般ユーザー・閲覧者の登録拒否 | PASS | 401 / 403 |
| 不正入力・異なる内容のキー再利用・対象不在 | PASS | 422、対象不在時はrollback |
| BによるAの取得・既読化 | PASS | 空一覧 / 404 |
| 既読・未読件数の再取得 | PASS | read_atと件数の永続化 |
| 公開前非表示・公開後表示・終了後非表示 | PASS | API・公開CLI・一括既読の除外 |
| HTTP送信先停止・復帰 | PASS | 保存維持、API回復、CLI再送 |
| 変更したJS/JSXのESLint | PASS | 対象ファイル限定 |
| 変更PHPの構文検査 | PASS | Docker PHP 8.3 |
| npm run build | PASS | 既存依存の不足をnpm installで補完後。大きなchunkの警告あり |
| npm run lint（全体） | FAIL | 変更対象外の既存箇所に40 errors / 10 warnings |
| 既存接続先への実Socket.IO接続（追加調査） | PASS | Nodeクライアント、WSS、443、namespace `/`。入室・配信は行っていない |
| 実WebSocketの認証・2ブラウザ受信・複数端末・切断再接続 | 未確認 | サーバー本体が不足 |
| ブラウザでの外観・クリックを含めた一連のE2E | 未確認 | APIテストとは区別する |
| 本番DB・実ブラウザWSS配信・FCM配信 | 未確認 | WSS接続のみ追加確認。本番変更・実配信なし |

再実行（今回と同じローカルDocker構成）:

```bash
docker exec tabi-apache-1 php /var/www/html/TABI/api/Notifications/tests/admin_notice_integration.php
npm run build
npm run lint
```

統合テストは `DB_HOST=db`, `DB_NAME=tabi` だけで実行可能です。テスト用PHPサーバーはコンテナの127.0.0.1:18092、HTTP emitスタブは18093で起動し、終了時に停止します。
外部のWebSocketへ通知せず、秘密値・Cookie・ユーザーのメールアドレスをログに出しません。テスト対象DBには検証以外の未送信お知らせを置かないでください（公開CLIは通常の未送信分も処理します）。
障害試験で既存のシステムエラー記録処理が動いた場合、その運用ログは残します。既存ログを巻き込む削除は行いません。

## 10. Chrome DevToolsでの確認

1. ユーザーA/Bは別ブラウザプロファイルまたはシークレット環境でログインします。同じプロファイルの別タブはCookieを共有するため別ユーザー検証になりません。
2. 管理者も別セッションで `/TABI/admin/notices/new` を開きます。
3. Network → Fetch/XHRで `Admin/index.php?resource=notices` のPOSTを確認します。title/body/target、保存されたnotificationIdを照合します。本人認証情報は共有しないでください。
4. ユーザー側では `List.php` / `UnreadCount.php` の成功を確認します。クリック時は `MarkRead.php?recipientId=...` を確認し、リロード後も既読になっていることを見ます。
5. Network → WSで `/socket.io/?EIO=4&transport=websocket...` を選び、Messages（Frames）を開きます。HTTP 101は通信路の開始であり、ユーザー認証の成功を意味しません。
6. 接続後の既存 `join_user` とサーバーの認証・入室判定、受信する `notification_created` を照合します。ブラウザから自由なユーザーIDを送るだけで入室できる場合はFAILです。
7. 全ユーザー通知ではA/B、特定ユーザー／グループ通知ではAだけにイベントと一覧の変化が出ることを確認します。
8. DevToolsのNetworkをOfflineにして切断し、通知を作成後Onlineへ戻します。再接続時に新しいWS接続と `List.php` / `UnreadCount.php` の再取得が発生することを確認します。
9. 同じイベントを再送しても一覧・件数が増殖しないこと、他のタブでログアウトすると接続が閉じることを確認します。

予約日時・終了日時・イベント欠落の回復用に、表示中は60秒ごとのAPI同期とフォーカス復帰時の再取得もあります。

## 11. 残作業

- 既存WebSocketサーバーのソースを確認し、ユーザー／管理者／グループの認証とルーム認可を実装・検証する。
- 実サーバーを使用し、A/Bのブラウザ・複数タブ・複数端末・ログアウト・再接続までのE2Eを行う。
- 本番DBの構造を確認して追加SQLを適用し、PHP・Reactを同時に配備する。
- 公開CLIを運用環境で毎分実行する。本番WSSプロキシ、証明書、ping/pong、常駐管理を確認する。
- 管理者お知らせと既存FCM送信サービスの接続、トークン・SW・ブラウザPushの実機試験は別途行う。
- 編集／削除や他端末での既読は即時イベント同期を追加していないため、他画面は次のフォーカス復帰・最大60秒の同期で反映する。

WebSocketサーバーが未確認のまま、認証やリアルタイム配信を完了扱いにはしていません。
