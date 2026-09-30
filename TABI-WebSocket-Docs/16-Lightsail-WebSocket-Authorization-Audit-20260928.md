# Lightsail WebSocket認証・room認可の読み取り調査（2026-09-28）

## 最終判定：FAIL

**user_id=2本人だけがuser:2 roomへ参加できることを、調査したAWS側サーバーソースは保証していません。**

`/home/ubuntu/tabi-ws-server/server.js` の122〜130行にある `join_user` ハンドラーは、受信したIDがtruthyかどうかだけを確認し、そのIDのroomへ参加させます。接続時の本人認証と、認証済みIDとの比較がありません。実ユーザーの別人roomへ参加する実験は行わず、ソースと設定の読み取りで判定しました。

問題を確認した段階でAWS側の調査を停止しました。AWS上のファイル・設定・環境変数・サービス・cron・Firewallは変更していません。PM2やNode.jsの再起動、インストール、本番通知送信、RDS変更も行っていません。

ローカルでは、依頼で明示許可された秘密鍵ファイルの権限を644から600へ変更し、本資料を追加しました。秘密鍵の内容を表示・複製・記録していません。AWSの.envは秘密値を表示せず、変数名・定義有無の確認と出力マスクにのみ使用しました。ログ本文は取得していません。

## 1. 接続対象と証拠の範囲

- ユーザー指定対象：Amazon Lightsail `tabi-ws-server`、Ubuntu、ap-northeast-1／ap-northeast-1a。
- SSH接続先：57.180.211.158、ユーザーubuntu。
- 接続先ホスト名：ip-172-26-15-95。提供されたPrivate IPv4と整合。
- AWS管理APIや管理画面でインスタンスID・リージョンを独立照合したものではありません。
- SSHホスト鍵は初回接続時の受入れで、別経路の指紋照合は未実施。known_hostsの保存先を/dev/nullとし、登録ファイルを変更していません。
- 稼働プロセス、待受ポート、systemd状態、プロジェクトのソース、PM2保存定義、Nginx設定を読み取りました。
- サーバー上のディスクのソースを調査した結果です。プロセス内のコードをダンプして、ディスクとの完全一致を検証したものではありません。PM2保存定義もlive jlistとは区別しています。

## 2. サーバー構成

| 項目 | 確認結果 |
|---|---|
| Node.js | 使用。NodeプロセスPID 35293。/usr/bin/nodeはv24.18.0 |
| Socket.IO | 使用。package.jsonの依存指定は^4.8.3。インストール済みの厳密な版は未照合 |
| HTTP | Expressとnode:http。http.createServer(app)へSocket.IOを接続 |
| 素のWebSocket | 独自の素WebSocketサーバー初期化はなし。Socket.IOが通信を管理 |
| PM2 | 稼働中。デーモンPID 35281、プロセス名にv7.0.3 |
| PM2保存定義 | name=tabi-ws-server、exec_mode=fork_mode、interpreter=node |
| systemd | nginx.serviceはactive/running。pm2-ubuntu.serviceは存在するがinactive/dead |
| Docker | dockerコマンドなし、docker.serviceはnot-found。調査した構成にDocker使用の証拠なし |
| Nginx | 使用。nginx.serviceのMainPID 508586 |
| Node待受 | 0.0.0.0:3001。実プロセスの待受とソースの指定が一致 |
| 外側待受 | TCP 80、443（Nginx設定と整合） |
| プロジェクト | /home/ubuntu/tabi-ws-server |
| エントリー | /home/ubuntu/tabi-ws-server/server.js（PM2保存定義） |
| package.json | /home/ubuntu/tabi-ws-server/package.json |
| 環境設定 | 同ディレクトリの.env。REALTIME_SECRET・PORTは定義あり。値は記録しない |

PM2保存定義に基づく起動内容は `node /home/ubuntu/tabi-ws-server/server.js` 相当です。過去に実行されたpm2 startコマンドの引数列そのものは確認していません。稼働NodeとPM2のcwdはこのプロジェクトで、cgroupはsession-7.scopeでした。pm2-ubuntu.serviceが非稼働なので、OS再起動後の自動復旧は別途確認が必要です。

## 3. Nginx・接続先

設定は `/etc/nginx/sites-enabled/tabi-ws-server` から `/etc/nginx/sites-available/tabi-ws-server` への参照です。

| 項目 | 確認結果 |
|---|---|
| server_name | ws.tabital.com |
| HTTPS/WSS終端 | Nginx、443 ssl、Let's Encrypt証明書のパス指定あり。秘密鍵は読まない |
| HTTP | ホスト一致時はHTTPSへ301リダイレクトする構成 |
| location | / |
| proxy_pass | http://127.0.0.1:3001 |
| WebSocket proxy | HTTP/1.1、Upgrade、Connection、Host等のヘッダーを転送 |
| Socket.IO path | カスタム指定なし。既定の/socket.io/を利用する構成 |
| namespace | カスタムnamespaceなし。既定の/ |
| 利用者認証 | 調査対象server blockにauth_request等による本人認証なし |
| CORS | Socket.IO側でHTTPS/HTTPのgenshin.mond.jpとlocalhost:5173を許可、credentials=true |

CORSは本人確認ではありません。また、Socket.IOのCORS設定はHTTP long-polling向けで、WebSocket接続を認証する仕組みではありません。[Socket.IO公式CORS説明](https://socket.io/docs/v4/handling-cors/)

3001は全インターフェース待受ですが、外部から直接到達できるかはFirewall／Lightsail側設定を調べていないため未確認です。

## 4. 接続認証とjoin_user：FAIL

ソース32〜50行のSocket.IO初期化にはCORS設定だけがあり、`io.use`、`socket.use`、`allowRequest`による認証はありません。Cookie、Session、JWT、handshake.authから利用者本人を検証する処理もありません。

82行からのconnectionコールバックは接続ログを出し、各joinイベントを登録します。socket.idはログ用に使用され、ユーザー本人を特定する認証情報ではありません。

問題箇所：`/home/ubuntu/tabi-ws-server/server.js:122`

関数：connectionコールバック内の匿名 `join_user` イベントハンドラー。

```js
socket.on("join_user", (userId) => {
  if (!userId) return;
  socket.join(`user:${userId}`);
});
```

| 確認項目 | 判定 |
|---|---|
| 接続時の利用者認証 | なし |
| 未認証接続の拒否 | 実装なし |
| 認証済みuser_idの取得 | 実装なし |
| 要求IDと本人IDの比較 | 実装なし |
| 別user_idのroom参加防止 | 実装なし |
| user_idの型・正整数検証 | truthy判定のみ |
| user:2への本人限定 | FAIL |

コード上、接続できたクライアントが数値2を送れば、本人の証明なしにuser:2へ参加します。PHP側でwhoamiを確認してからIDを送る現在のフロント処理も、別のクライアントによる直接送信をサーバー側で防ぐものではありません。

## 5. room管理と他の影響箇所

| ハンドラー | 行 | room | 認可 |
|---|---|---|---|
| join_admin | 88 | admin:global | 管理者確認なし |
| join_cottage | 98 | cottage:{cottageId} | IDのtruthy判定のみ、所属確認なし |
| join_trip | 110 | trip:{groupId} | IDのtruthy判定のみ、所属確認なし |
| join_user | 122 | user:{userId} | IDのtruthy判定のみ、本人確認なし |
| disconnect | 134 | — | ログ出力のみ |

明示的なleaveイベントや、別ユーザーIDでjoinし直したときに以前のuser roomを退出する処理はありません。同一接続が複数のuser roomへ参加できる構造です。

同一ユーザーの複数タブ・端末は、それぞれ別socketとして同じroomへ参加する構造です。通常の切断時にはSocket.IOが参加roomから自動退出させます。独自のsocket保持配列は見つかりませんが、異常切断やメモリ残留の実測は行っていません。[Socket.IO公式Rooms説明](https://socket.io/docs/v4/rooms/)

影響は通知に限りません。上記roomへ送られる管理者・旅行等のイベントも、権限のない接続へ届くおそれがあります。実際の侵害や過去の漏えいを確認したものではなく、全イベントの機微情報量までは調査していません。

## 6. notification_createdとemit API

| 項目 | 確認結果 |
|---|---|
| エンドポイント | https://ws.tabital.com/emit |
| method | POST |
| AWS側実装 | server.js:144のExpressハンドラー |
| Authorization確認 | あり |
| 共有秘密値の検証 | あり。REALTIME_SECRETとの一致比較 |
| 未設定・不一致 | 401。サーバー秘密値未設定時も拒否 |
| Bearer形式 | Bearerという文字列を除去して比較。スキームの厳密検証ではない |
| request body | room、event、data |
| userIds配列の専用処理 | なし。PHP側でユーザーごとのroomを指定 |
| 入力検証 | roomとeventのtruthy判定のみ。不足時400 |
| event許可リスト | なし |
| room種別・型の制限 | なし |
| 送信処理 | server.js:184のio.to(room).emit(event, data || {}) |
| 成功時 | JSONでok、room、eventを返す |

Bearer共有秘密値は表示・記録していません。.envの値は出力のマスク処理にのみメモリ内で使用しました。厳密には、生の共有秘密値だけのAuthorizationでも比較に通る書き方です。秘密値の一致確認自体がないという意味ではありません。

AWSソースにはnotification_created専用の送信処理がなく、認証済みemit呼び出しのeventとして受け取る汎用中継です。全接続へのio.emitではなく、指定room宛てです。

準備済みTABIの `api/Admin/services/notices.php` は、保存済みrecipientごとにuser:{id}・notification_created・notificationIdを `api/Admin/services/realtime.php` へ渡します。今回の通知用の新PHPは未配備であり、この経路を本番通知で実行した結果ではありません。

送信先をuser:2に指定しても、room参加者の本人性が保証されないため「user_id=2だけが受信する」という条件は満たせません。emit側の共有秘密認証と、受信側の利用者認証は別の保護です。

## 7. ログ保存先

ログ本文は読まず、保存定義とソース上のログ出力箇所だけを確認しました。

| 種類 | 保存先／実装 |
|---|---|
| 接続・join・disconnect・emit | /home/ubuntu/.pm2/logs/tabi-ws-server-out.log |
| Node標準エラー | /home/ubuntu/.pm2/logs/tabi-ws-server-error.log |
| Nginxアクセス | /var/log/nginx/access.log |
| Nginxエラー | /var/log/nginx/error.log |
| emit認証失敗専用ログ | ソースに明示的なconsole出力なし。HTTP 401はNginxアクセスログの対象になり得る |
| 接続認証失敗ログ | 接続認証が未実装のため、その失敗ログもなし |

## 8. 推奨修正案（未実施）

1. 既存PHPセッションで本人を確認し、短寿命・用途限定のWebSocket用署名トークンを発行する。同じemit用共有秘密値をブラウザへ渡さない。秘密鍵をVITE_変数へ入れない。
2. AWS側のio.useで署名・有効期限・issuer・audience・user_idを検証し、不正・未認証接続を拒否する。検証したIDはsocket.data.userIdへ保持する。即時失効要件はPHP側への照会等を含め別途設計する。
3. user roomは検証済みIDからサーバーが決定する。可能なら接続時に自動参加し、join_userで任意IDを受け付けない。互換維持でjoin_userを残す場合も本人IDとの完全一致を必須にする。
4. join_adminはサーバーが検証した管理者権限を必要とする。trip・cottageは所属・アクセス権を検証し、未所属を拒否する。クライアントが送るroleを信用しない。
5. アカウント切り替え時は旧socketを破棄し、新しい認証情報で再接続する。トークン期限・失効時の接続継続方針を定義する。
6. emit APIは既存共有秘密認証を維持し、Bearer形式、room・event・dataの型、roomとeventの許可された組み合わせを検証する。既存全イベントの一覧を照合してから制限し、通知以外を一律に壊さない。
7. Nodeのloopback待受化と3001の外部遮断、開発用Originの本番除外を検討する。実際の直接利用・Firewallを確認してから行い、今回変更しない。

Socket.IOの接続認証は公式のmiddleware方式で実装できます。[Socket.IO公式Middlewares説明](https://socket.io/docs/v4/middlewares/)

### 修正時の影響ファイルと反映

- AWS：/home/ubuntu/tabi-ws-server/server.js。依存ライブラリ追加が必要ならpackage.jsonとlockも対象。
- PHP：既存セッション認証を利用するWebSocketトークン発行APIとサーバー専用鍵設定。具体的な新規ファイル名・鍵管理方式は設計後に確定。
- フロント：src/pages/userSocket.js、src/pages/UserRealtimeListener.jsx、管理者側socket／listener、trip・cottageのjoin呼び出し元。
- emitの入力契約を変更する場合：api/Admin/services/realtime.phpと全呼び出し元の互換性確認。
- Nginxは認証方式によって必要な場合のみ変更。現在のproxy構成を変更する必要性は未確定。

Nodeコードの反映にはプロセスの再起動または置換が必要です。現在の保存定義はfork_modeなので無停止reloadを前提にしません。認証未対応の既存クライアントは接続を拒否されるため、PHP・フロント・AWSの切り替え順と再ログイン／再接続を同時に計画します。変更・再起動は別途明示許可が必要です。

## 9. 修正後の必要テスト

- 未認証、改ざん、期限切れ、不正issuer/audienceの接続拒否。
- 認証済みuser_id=2のみuser:2へ参加。別ID要求・不正型・複数IDへの参加を拒否。
- 一般ユーザーによるadmin:global参加、未所属trip/cottageへの参加を拒否。
- 複数タブ・端末で本人roomを正常受信。ログアウト・アカウント変更・切断後に以前のroomを受信しない。
- emit APIの秘密値なし・不一致を拒否。不許可event／room／不正データを拒否。
- 許可したnotification_createdは対象roomだけに届き、対象外の接続に届かない。
- 正式な本番テストは管理者user_id=1から受信者user_id=2だけ。DB宛先1件、未読・既読・再読み込み・同一requestKey重複防止を確認。
- 攻撃的な別人room参加試験はまず隔離環境で実施。本番の他ユーザーroomへ無断参加しない。

**本人room認可の修正・検証前には、本番限定通知を「本人だけ受信」の合格条件で実施しない方針を推奨します。** 今回は調査結果と修正案の提示で停止します。
