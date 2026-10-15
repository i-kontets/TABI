# メンテナンス表示とRDS接続の切り分け（2026-09-30）

## 現時点の結論

### 10:26の接続回復（最新）

**10:26:06 JST、本番HTTP status.phpはAVAILABLE／databaseAvailable=true／scheduledToRun=trueへ回復し、応答は約0.110秒になった。** 続いてロリポップPHPから同じ本番設定でPDO接続約0.124秒、SELECT 1=1を確認。Codexによるコード・DB・AWS設定・起動操作は行っていない。起動中のRDSが利用可能になった状況と整合し、この障害に対するコード変更やALTERは不要だった。10:11の正確なAWS状態は履歴未取得のままなので、停止開始・起動要求時刻は断定しない。

10:26:41 JSTのRDS読み取り結果:

| 項目 | 結果 |
|---|---|
| DB時刻・セッションtimezone | NOWとUTC_TIMESTAMPはともに01:26:41、UTC。PHPのJSTとの差は想定どおり9時間 |
| admin_notices／notifications／notification_recipients／notification_settings件数 | 4／1／1／1 |
| admin_noticesのrequest_key非NULL行 | 0。新しい重複防止キーによる限定通知はまだ作成されていない |
| 追加4列 | target_id bigint、notification_id bigint、request_key varchar(64)、realtime_published_at datetime。すべてNULL可・DEFAULT NULLで存在 |
| レビュー対象インデックス | notification_id／request_keyのUNIQUE 2本と、realtime_published_at・start_atの通常複合インデックスを確認 |
| 外部キー | fk_admin_notice_notificationがnotifications.notification_idを参照 |
| user_id=1 | active、deleted_at=NULL、admin_level=9 |
| user_id=2 | active、deleted_at=NULL、admin_level=0 |

実行したSQLはSELECTのみ（information_schemaの列・インデックス・外部キー参照を含む）。パスワード・ハッシュ・トークン等は取得していない。今回の確認は列等の存在と上記属性・件数の確認で、全データ値や全DDLの完全照合ではない。再ALTER・書き込み・通知送信はなし。

**更新後の判定：本番DB疎通はPASS／ユーザーの実画面復帰は未確認／通知本番E2Eは未完了。** ユーザーに完全再読み込み後の表示と管理者1の正規ログイン準備状況を確認中。管理API限定の書き込み停止は維持し、接続回復だけを理由に解除しない。下記のFAIL・接続不能の記述は10:11〜10:23時点の調査記録として保持する。

### 10:23以降のAWS画面確認

ユーザーが提示した接続手順画面に続き、同じChromeのRDS概要を読み取ったところ、対象tabi-rdsは **「起動中」**、通知欄は「データベースを起動しています」と表示していた。接続手順の表示はMySQL接続成功の証明ではなく、この時点でRDSはまだ利用可能状態ではない。Codexは起動・停止・設定変更を操作していない。

コンソールのエンドポイントと本番PHP設定は、実値を記録せず比較して一致した。ポート3306、DB名tabidbも一致。10:23:59 JSTの本番status.phpは引き続き約3.178秒、DATABASE_UNAVAILABLE／databaseAvailable=falseだった。起動中の時点の利用不可とは整合するが、10:11時点の正確なRDS状態や起動要求時刻はイベント履歴未取得のため断定しない。

画面に表示されたSGルールはInboundのIPv4 /32が2件、Outboundが1件。ルールのポート詳細・現在の送信元との一致までは未確認。「インターネットアクセスゲートウェイ：無効」の表示だけを根拠にSGや公開アクセス設定を変更しない。まず起動完了後の本番PHP接続を再確認する。ログとイベントへの移動はUI操作エラーで内容取得に至らなかった。

2026-09-30 10:11〜10:18 JSTの実測では、本番PHPはDB利用不可を返している。ロリポップ上でも本番用RDS設定によるPDO接続が失敗し、さらに同じホストのTCP 3306接続がタイムアウトした。**SQL実行前の接続段階に問題があり、通知テーブルのALTERで解消できる根拠はない。**

ユーザーの「DBへ接続できる」はAWS RDSのブラウザ管理画面での確認だった。管理画面上の状態と、アプリケーションからのDB接続成功を区別する。RDSの現在の状態・エンドポイントの一致・セキュリティグループ・経路のどこに原因があるかは未確定。設定を推測で変更しない。

アプリコード、本番ファイル、DB、AWS設定、PM2、cron、停止ルールはこの調査で変更していない。今回の変更はこの記録とREADMEだけ。認可を緩める対応、通知再送、過去通知の補完は行っていない。

## 本番HTTPと接続元別の証拠

`GET https://genshin.mond.jp/TABI/api/system/status.php` の実応答:

```json
{
  "success": true,
  "status": "DATABASE_UNAVAILABLE",
  "databaseAvailable": false,
  "scheduledToRun": true,
  "checkedAt": "2026-09-30T10:11:32+09:00",
  "nextScheduledOpenAt": null,
  "nextScheduledCloseAt": "2026-09-30T20:00:00+09:00",
  "timezone": "Asia/Tokyo",
  "available": false,
  "serviceAvailable": false,
  "databaseScheduled": true,
  "reason": "DATABASE_UNAVAILABLE",
  "now": "2026-09-30T10:11:32+09:00",
  "nextOpenAt": null,
  "nextCloseAt": "2026-09-30T20:00:00+09:00"
}
```

- HTTP 200、Content-Type `application/json; charset=UTF-8`。HTMLへのRewriteやJSON解析失敗ではない。
- Cache-Control `no-store, no-cache, must-revalidate`、Pragma `no-cache`。
- 最初の測定は約3.218秒。別のcurl測定はDNS 0.002秒、TCP 0.016秒、TLS 0.037秒、先頭応答3.168秒、全体3.170秒。静的maintenance HTMLは約0.072秒。ブラウザからWebサーバーまでのDNS/TLSより後で待っている。

| 接続元・対象 | 実測結果 | 限界 |
|---|---|---|
| 本番HTTP status.php | DB利用不可、稼働予定内 | HTTP 200は状態確認API自体の成功 |
| ロリポップPHP CLI、本番ホスト名をHTTP_HOSTへ指定して設定を評価 | `aws`／tabidbを選択。PDO接続約3.118秒で失敗。HY000／ドライバ2002 | HTTP SAPIそのものの環境変数を観測したものではない |
| ロリポップ→同一RDSホストのDNS | 約0.0001秒でIPv4へ解決成功 | DNS成功だけではDB起動や到達可能性は証明しない |
| ロリポップ→同一RDSホスト TCP 3306 | 約3.003秒、errno 110、タイムアウト | SG・NACL・経路・RDS状態等の個別原因は未確定 |
| ローカルDocker PHP、ローカル設定のaws接続 | 接続段階で約3.046秒後に失敗、ドライバ2002 | 本番Web実行とは別環境 |
| ローカルDocker HTTP status.php、ローカルDB | 約0.018秒、AVAILABLE、databaseAvailable=true | 本番RDSの成功証拠ではない |

本番用設定とローカルaws設定のホスト・DB名・ポートは値を表示せず照合し、一致した。DB名はtabidb、ポート設定なしでMySQL既定3306を使用。接続先ホストの実値は記録しない。PDO接続失敗のためRDSではSELECT 1まで到達していない。

## コードの経路と行番号

1. `api/config/env.php:18` の `detectAppEnv()` はサーバーのAPP_ENVを優先し、未設定ならHTTP_HOST等で判定する。本番ドメインはaws、ホスト指定なしのCLIはlocal。実測したCLIのAPP_ENV環境変数は未設定。`.env.local`のVite設定をPHPが自動共有する経路はない。
2. `api/system/status.php:31` で `tabiEvaluateServiceSchedule()` を呼び、`:32`からenv.phpと選択されたconnectionsを読む。`:56`付近でPDO接続、`:68`でSELECT 1。セッション初期化・外部HTTP・明示sleep・通知テーブルSQLはない。
3. `api/system/status.php:91` はDB利用不可かつ稼働予定内ならDATABASE_UNAVAILABLEを選び、`:97`から上記JSONを返す。本番status.php/db.phpはローカルと改行を正規化したソースが一致。バイトハッシュ差だけを実装差と扱わなかった。
4. `src/services/serviceStatus.js:52` の `fetchServiceStatus()` はBASE_URLにapi/system/status.phpを足し、credentials:include・cache:no-storeで取得する。`:26`のnormalizerは今回のboolean falseをfalseとして扱う。今回の応答についてキー名・真偽値の誤解釈はない。
5. `src/pages/Maintenance/Maintenance.jsx:108` のcheckが状態を更新し、available=trueなら保存した戻り先へ移動する。初回、60秒ごと、タブ再表示時に確認する。約3秒は各HTTP処理時間であり、ポーリング間隔ではない。
6. 一般画面からの自動遷移は `src/services/systemErrorReporter.js:441` のfetchラッパー。`:460`付近でstatus.php等を除くHTTP 503のJSONを読み、DATABASE_UNAVAILABLE等の既知コードなら`:468`でmaintenanceへ移動する。`api/config/db.php`のPDO接続失敗がそのJSON 503を返す。通知SQLの個別失敗を、この接続用catchで一括分類する実装ではない。
7. `ServiceAvailabilityGate.jsx:72`にも遷移処理があるが、現在のApp.jsxはimportだけでRoutesを囲んでいない。この未使用コンポーネントを実際の遷移原因とは断定しない。管理側のAdminServiceGateは別のDB停止表示を行う。

過去にどのリクエストが当該ユーザーの最初のmaintenance遷移を起こしたかは未確認。現在のHTTP応答と接続失敗は確認済みだが、履歴の因果を推測で埋めない。

## ブラウザ・認証・キャッシュ

操作できたMacのChromeは `/TABI/admin/settings` を表示し、画面は「稼働予定時間内ですが、データベースへの接続を確認できない状態」。Networkには同じstatus.phpの200、約3.03〜3.18秒、network転送の記録があった。表示中ページのInitiatorは `main-CppXno4J.js` で、本番index.htmlの `main-D0SXypcF.js` と異なるため、このタブには旧フロントが残っている可能性がある。読み込み時刻・当該ブラウザの本文・Cookie属性は未確認。依頼のmaintenance画面そのものとこの管理画面を同一視しない。

ネイティブChromeの通信詳細操作は、状態変更とウインドウ取得エラーで完了できなかった。Cookie・セッションID・トークンの値は取得結果へ出していない。Service Workerの実稼働・キャッシュ経由有無は当該ブラウザでは未確認。リポジトリのFirebase WorkerにAPIキャッシュ用fetchハンドラはなく、外部HTTP測定にはService Workerが介在しない。

`POST /TABI/api/auth/WebSocketToken.php` をCookieなしで確認すると、約0.110秒で401／「ログインが必要です。」。同PHPの`:23〜27`でセッション本人IDを検査し、欠落ならDB接続前に拒否する。元のブラウザの401が同じ理由か、セッション失効・Cookie未送信等のどれかは未確認。CLIのCookie既定値はPath=/、Domain空、Secure=0、SameSite空だったが、本番HTTPの実Cookie属性と同じとは断定しない。

401単独はfetchラッパーの503条件を満たさず、全体メンテナンスへ直接遷移しない。認証付きSocketクライアントは401/403でdisconnectし、自動再試行を停止する。Socket.IOの101だけではアプリケーション認証や本人roomへの参加成功を証明できない。

## 時刻と停止設定

- 検証日は水曜日、Asia/Tokyoの稼働時間内。過去の9月28日を現在として判定していない。
- `api/config/serviceSchedule.php`は本番とローカルで一致。月・水・木08:30〜20:00、金08:30〜12:30、火土日なし。開始を含み停止時刻を含まない。PHP曜日番号N（1=月〜7=日）。特別日設定は空。
- 実装はDB接続成功を優先する。DBが動いていれば予定時間外でもAVAILABLE。失敗時にだけ予定内障害／予定停止を区別する。無断で「時間外は必ず停止」へ仕様変更していない。
- CLI PHPの既定timezoneはAsia/Tokyo。DBサーバー時刻は接続不能で未確認。status判定はDB時刻を使わず明示的なJSTで計算する。
- `api/.htaccess:7〜11`に既存の管理書き込み停止を確認。GET/HEAD/OPTIONS以外の通常Adminおよび重複api/Adminを503にする。ルート.htaccessは通常のSPA Rewriteのみ。ログイン・status・Notifications・SPAをこの停止ブロックで遮断するルールではない。
- 手動全体停止用のDB設定を読み込む処理はstatus.phpにない。既知の配備時停止は上記Adminルール。ホスト上位設定やAWS側の停止状態まで調査済みとはしない。
- cronは今回操作していない。表示できたロリポップのcron画面は空の新規登録フォームと残り10件。既存の「登録なし」というユーザー確認と整合する。

## 検証結果（環境を分ける）

| 条件 | ローカル／コード | 本番 |
|---|---|---|
| 1. 時間内・PHP DB接続成功で通常利用 | HTTP statusはPASS。ブラウザの復旧遷移も応答スタブでPASS | FAIL：接続が成功しない。画面の誤判定とは未確定 |
| 2. 時間外／手動停止 | 日付境界の予定判定PASS。DB成功優先という現仕様を確認 | 時間外の実運用は未確認。Admin限定停止は存続 |
| 3. 未認証と全体停止を区別 | Socketクライアント401停止テストPASS、遷移条件を確認 | Cookieなしtoken401 PASS。実ブラウザの本人状態は未確認 |
| 4. 正規tokenと本人room | 前回の検証記録を維持。今回の新規本番認証検証なし | 未確認：正規セッション準備とDB復旧が必要 |
| 5. WSだけ失敗時のAPI通知取得 | API再取得経路は既存コードにある | 未確認：今回はDBも利用不可 |
| 6. status失敗・復旧 | 本番同型のfalse JSON→true JSONをローカルブラウザで再現しmaintenance退出PASS。任意の解析失敗までPASSとはしない | 復旧していないため未確認 |
| 7. Admin限定停止の範囲 | 隔離Apache Rewrite22項目PASS。DBを使わないダミーAPI | 配置ルール確認済み。変更なし |
| 8. 管理者1→ユーザー2通知 | 今回は未実施 | 未確認：正規管理者ログインとDB復旧が先 |
| 9. 警告時刻と停止時刻 | 月水木19:30、金12:00は稼働中。曜日・境界12ケース確認 | cron自動実行は未確認 |

補足：19:59:59の警告dueを当初trueとした試験期待値は誤りだった。既存仕様では停止直前1分は警告CLIの新規実行を避ける。期待値をfalseに訂正し、サービスavailable=true／警告due=falseを再確認した。サービスの20:00停止と混同しない。Socketクライアントの既存テストは5件PASS。

初期表示がOUTSIDE_SERVICE_HOURSになること、JSON解析失敗をDATABASE_UNAVAILABLEへまとめること、保存済み理由による二重status取得はコード上の改善候補。ただし今回の正常JSON・TCP失敗を説明する原因ではなく、接続問題の修正として混ぜて変更していない。

## DB変更・復旧・次に必要なこと

- DB変更SQLはなし。許可された4テーブルにも、範囲外のテーブルにも変更なし。接続失敗により実RDSの現定義・新規通知件数の再取得は未実施。
- 9月28日のレビュー済み4列適用と当時の既存データ照合は記録18を参照。未適用と決めつけて再ALTERしていない。記録19のテスト通知未作成は当時の確認であり、今回の最新SELECT結果と偽らない。
- 新しい本番退避・配備・ロールバックはなし。既存非公開バックアップ、追加列、通知データ、認可修正版をそのまま保持。
- 次はRDSコンソールの「接続とセキュリティ」で状態・接続先一致・3306の到達条件を読み取り確認する。SG等が原因と確定する前に設定変更を提案・実行しない。今回の許可にRDSインスタンス設定変更は含まれない。
- DB到達性が回復した後、本番statusがAVAILABLEになること、完全再読み込みしたブラウザが復帰すること、正規管理者1と受信者2を確認する。その後に承認済み手順で必要な停止調整とPush OFFの限定テストへ進む。
- 管理書き込み停止は維持。復旧だけを理由に無断解除しない。管理者資格情報不明を権限変更で解決しない。
- **メンテナンス問題：接続段階まで原因を特定、復旧未完了。通知基本機能：本番E2E未完了。** 停止30分前通知の自動運用とFCM/Web Pushも未確認。cron操作はユーザーが行う。
