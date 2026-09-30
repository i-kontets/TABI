# 本番通知の完成条件と実行記録（2026-09-28）

> 最新状態：管理側Chromeもuser_id=2で、管理APIの権限チェックにより保存は拒否されています。管理者1のログイン情報は不明とユーザーから回答されたため、限定テストを停止し、管理APIの書き込み停止を再有効化しました。RDSに新規通知はありません。DB・配備コード・秘密設定は保持し、権限変更・再設定・再送・cron操作はしていません。[原因調査19](19-Limited-Notification-Diagnosis-20260928.md)を参照してください。以下のactive設定という記述は停止を戻す前の経過です。

## 最新の承認と停止位置

DB変更の承認対象はRDSのtabidb、admin_noticesのレビュー済み4列・UNIQUE2本・索引1本・外部キー1本だけです。同一定義が適用済みなら再実行せず、相違・部分適用があれば推測で修正しません。

正規管理者API経由の通知1件と受信者2の既読更新、同じrequestKey・同じ内容の再送による重複防止確認は承認済みです。作成者は管理者1、宛先はユーザー2だけ、Push OFF。過去のお知らせの補完・再送、全員向けテスト、権限変更、通知のSQL直接追加・削除は行いません。

既存のPHP・フロント・.htaccess切り替え許可は再利用します。AWSへの従来の許可は読み取りとステージングまでだったため、次の不足分を1回の確認にまとめ、ユーザーから「3点を許可する」と明示承認を受領しました。

1. 新しい署名秘密値を非表示で生成し、ロリポップの公開外秘密ファイルとLightsailの.envへ設定すること。
2. Lightsailの本番server.jsを検証済み候補へ切り替え、auth.mjsを追加すること。
3. PM2のtabi-ws-serverだけを再起動すること。

検証環境が未準備の間は停止しました。その後、ユーザーからChromeの管理者1・Safariのユーザー2のログイン完了、他管理者の作成・編集・削除停止、公開CLIの手動実行禁止、全ユーザー送信禁止の条件で段階的に続行する指示を受領しました。cron操作はユーザー側が実施します。

**現在はRDS・PHP・フロント・AWS認可修正版を反映済みです。管理APIは排他的な限定テストのために停止を解除しましたが、通常運用の再開は案内していません。通知はまだ作成・送信していません。** ユーザーは同じMac上のブラウザと回答し、Safariの未読0件を報告しました。Chromeには検証タブを開いて新規画面を確認できましたが、Safari取得はタイムアウトしたため、受信側の確認はユーザー操作で進めます。

Chromeへ「限定通知テスト 2026-09-28」、特定ユーザー2、Push OFFを入力済みです。ブラウザツールの確認ダイアログ確定操作がタイムアウトしたため、再送せずRDSを確認しました。追加行はなく、admin_notices 4行／notifications 1行／notification_recipients 1行のままです。ユーザーに確認ボタンとOKの1回操作、およびSafariで再読み込みなしの通知表示・未読0→1の観測を依頼中です。通知を開く操作はその確認後に行います。

### 最初の停止連絡を受け取る前に完了した秘密設定

- 新しいWS_AUTH_SECRETを非表示で生成し、ロリポップの `/home/users/1/mond.jp-genshin/private/TABI/ws-auth-secret` とLightsailの既存 `.env` に設定しました。
- 両ファイルの権限600と、両側の値が生成値と一致することを確認しました。確認出力は一致の成否のみで、実値は出力・記録していません。
- AWSの既存.env内容を保持し、変更前の.envを公開外 `/home/ubuntu/tabi-ws-staging/20260928T052128Z-auth/.env.before-production-auth` に権限600で退避しました。
- この秘密設定時点ではRDS変更、本番コード切り替え、PM2再起動、通知送信は未実施でした。後続の実施結果は以下に記録しています。
- 最初の停止連絡後は準備完了連絡まで追加の本番操作を行いませんでした。設定済み秘密値は削除・再生成していません。

## 今回の変更点

PHPの秘密値読取を具体化しました。環境変数が利用できない共有ホスティングでも、公開外の `/home/users/1/mond.jp-genshin/private/TABI/ws-auth-secret`（権限600）を読めるようにしています。権限不備・symlink・読取不可の場合は接続認証を拒否します。本番秘密ファイルと対応PHPは反映済みです。

変更ファイルはapi/auth/WebSocketAuth.php、WebSocketToken.php、ローカル統合テスト。日本語コメント付きです。PHP構文PASS、公開外秘密設定4項目を含めPHP統合25項目PASS。途中のテスト用Session作成と先行標準出力の競合は、テスト側の出力バッファで解消し、再実行が全件成功しています。

PHP17＋フロント24ファイルの配備物を更新しました。AWS修正候補の変更はありません。既存手順・ステージング・退避を再利用します。詳細と最新ハッシュは[ステージング記録](17-WebSocket-Authorization-Staging-20260928.md)を参照してください。

## RDSとAWSの再確認（読み取りのみ）

- SELECT DATABASE()で接続先がtabidbであることを照合。
- admin_noticesは旧13列。追加予定4列は全て未作成。索引は既存PRIMARYとidx_admin_notices_status。
- admin_notices 4行、notifications 1行、notification_recipients 1行、notification_settings 1行。各行の値は公開外の退避データと一致。
- 管理者1はactive・未削除・admin_level=9。受信者2はactive・未削除の一般ユーザー。
- 公開CLI用のDBロックは未保持。これは手動CLIの不稼働を証明するものではない。
- INNODB_TRX参照は可能で照会時点の可視トランザクションは0。書き込み停止後の排出確認はまだ実施していない。
- AWSの本番server.js、ステージング候補、PM2/NodeのPID・起動tickは前回検証時と一致。
- この読み取り時点では新署名秘密値はAWS .envへ未設定、ロリポップの公開外秘密ファイルも未作成でした。その後の承認済み設定結果は冒頭に記録しています。

## SQL適用記録

**2026-09-28 15:55:50 JST、レビュー済みALTER 1文を1回適用しました。** 実行SQL全文は[このSQLファイル](../database/migrations/20260928_link_admin_notice_notifications.sql)です。追加の構造変更・直接の通知DMLは実施していません。

- 適用前：tabidbを確認、旧13列、追加4列なし、既存PRIMARYとidx_admin_notices_statusのみ。4テーブルの既存行は非公開退避と一致。
- 停止確認：通常・重複AdminのPOST/PATCH/PUT/DELETEはすべて503。GETは404、HEAD/OPTIONSは405で既存APIの応答まで通過。SPAは200、未ログイン通知一覧は401。
- 排出確認：可視INNODB_TRXは0、同じDBまたはDBユーザーの他の実行中接続は0。DDL待機上限を5秒に設定。
- 適用後：17列。target_id／notification_idはbigint、request_keyはvarchar(64)・ascii_bin、realtime_published_atはdatetime。全てNULL可・DEFAULT NULL。
- UNIQUEのuq_admin_notice_notification(notification_id)、uq_admin_notice_request(request_key)、通常索引idx_admin_notice_publish(realtime_published_at,start_at)、外部キーfk_admin_notice_notification→notifications.notification_id（ON DELETE SET NULL）を確認。
- 元の13列の定義・全行値、notifications 1行、notification_recipients 1行、notification_settings 1行の保持を確認。既存admin_notices 4行の追加4列はすべてNULL。
- 実行SQLと結果は非公開退避先のalter-executed.sql、alter-verification.jsonにも保存。追加列は復旧時も残します。

## 本番コード切り替えと障害復旧

1. 非公開stage-auth-v3へ最新41ファイルを準備し、全ハッシュ一致、PHP17ファイル構文、DB非接続dry-run、旧版384ファイル不変を確認。新規認証PHP2ファイルが元は存在しないこともprevious-auth-manifest.jsonへ記録しました。
2. api/.htaccessを停止版へ変更し、上記HTTP確認後にALTERを実行しました。ルート.htaccessは変更していません。
3. 新PHP・asset・index.htmlを反映。旧assetは保持。公開URLのindex.html、main-D0SXypcF.js、index.esm-hNB43mnu.js、main-Dj9O1BrQ.cssが配備物と同一ハッシュであることを確認しました。
4. AWSのauth.mjsとserver.jsを反映し、PM2のtabi-ws-serverだけを再起動しました。しかしPM2がonlineでもポート3001が待受せず、公開URLで502を確認しました。管理書き込み停止を維持し、テスト通知は送信していません。
5. 原因は直接起動用のimport.meta.url／argv[1]比較でした。PM2のfork起動ではargv[1]がラッパーになるため、PM2のpm_exec_pathを優先するよう修正。認証判定は緩和していません。
6. deployment/websocket/startup.test.mjsを追加し、PM2の入口を別プロセスで再現、loopbackだけでHTTP待受を検証。ローカル・AWS隔離領域で認可試験と合わせて11 PASS／PHP相互検証1 SKIP（既存のローカル別試験で検証済み）。
7. 修正版を反映し、同じ対象だけを再起動。**今回のPM2再起動は合計2回**です。公開health 200、未認証・不正署名・正しい署名だが期限切れのSocket.IO接続はAUTH_INVALID、認証なしemitは401、未ログインPHP token APIは401を確認しました。

AWSの最終server.js SHA-256は `b5bb0e25944c66998effbcbfb40024246e79c70a81a68be41f0628fb1b077474`。復旧候補・試験記録・切り替え前ファイルは `/home/ubuntu/tabi-ws-staging/20260928T0659Z-startup-fix/` に保全しました。旧認可なしコードへの復元、データ削除、Nginx・Firewall・cron変更は実施していません。期限切れ試験は正規ログイン経路の検証とは別の否定試験であり、通知イベントは送信していません。

## 完成条件の判定

以下の判定対象は本番です。ローカル／ステージングのPASSとは区別します。

| 完成条件 | 本番判定 | 根拠／残作業 |
|---|---|---|
| レビュー済みDB構造の適用 | PASS | 上記17列・索引・外部キー・既存データ保持確認 |
| 管理者1の正規画面から登録 | 未確認 | 正規ログインはユーザー申告済み。完全再読み込みと画面確認待ち |
| admin_noticesとnotifications対応 | 未確認 | 限定通知未作成 |
| 今回の宛先がuser2だけ | 未確認 | 限定通知未作成 |
| 認証済みuser2がWebSocketを受信 | 未確認 | 本番認可修正版反映済み。正規セッションでの受信待ち |
| 未認証・不正署名・期限切れ拒否 | PASS | 公開WSS接続でAUTH_INVALIDを確認 |
| 他人のroom参加拒否 | PASS（本番WSの認可単体） | 15秒の検証用署名claimでID2はuser:2参加可、user:1／admin:globalはROOM_FORBIDDEN。PHPの正規ログイン・本人発行経路の検証は別途未確認 |
| 対象外ユーザーへの非配信 | 未確認 | DB宛先・送信範囲・拒否動作を本番で検証する |
| 更新操作なしで一覧と未読数更新 | 未確認 | 本番ブラウザ検証待ち |
| 既読とリロード後の維持 | 未確認 | user2で実ブラウザ確認待ち |
| 同一requestKeyの重複防止 | 未確認 | 同じ1件の正規API再送待ち |
| 一時切断から復帰しAPIで回復 | 未確認 | 同じ通知1件を用い、追加通知は作らず確認する |

一時切断回復の検証は、最初の通知の受信・画面更新を確認した後、受信者2の別の一時オフライン画面で同じ通知をAPIから回復できることを確認します。別通知の追加や無条件再送は行いません。ブラウザ操作で観測できない項目は未確認のまま記録します。

## 運用・復旧の扱い

- 一時停止は通常／重複管理APIを含めて実施し、開始前の処理が終わったことを確認してからALTERへ進む。
- 新旧混在中に通常運用を再開しない。限定テストのための停止解除は、他の書き込みを止めた排他的な検証時間に限る。
- 問題時は影響する処理を安全に止め、適用済み変更・保持データ・送信済みの外部効果を記録する。
- 認証を外す、データを消す、認可不備の旧AWSへ自動復元する対応はしない。
- 追加列・通知・宛先・request_key・既読状態は保全する。
- 手動公開CLIを限定テストの代用として実行しない。

## 停止30分前通知と別工程

**停止30分前通知：コード検証済み／自動運用は未確認。**

既存の時刻テスト41項目で、JSTの月水木19:30、金12:00、火土日の非通知、重複防止、時間外DB非接続を検証済みです。今回は本番cronを登録・変更していません。ユーザーがcronを登録し、本番の自動実行と全対象への通知開始を別途確認するまでは、自動運用完了としません。

FCM/Web Pushは別工程です。今回のWebSocket検証をもって完成と報告しません。

## 現在の結論

- DB変更：適用・確認済み。既存データ保持PASS。
- 本番秘密設定：承認後に実施済み。両側の権限600・値の一致確認済み。
- 本番コード配備：実施済み。PM2は対象1プロセスだけ計2回再起動。初回の待受不具合は修正後に公開URLで復旧確認。
- 即時通知の基本機能：本番未確認、未完成。
- 次の作業：Chromeの入力済み通知をユーザーが1回確定し、Safariの未読0→1・自動表示とDBの宛先を確認する。一般運用はまだ再開していない。cron未操作、通知未作成。ユーザーによる他管理者・手動CLI停止を維持する。
