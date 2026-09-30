# 環境変数・AWS WebSocket接続経路の追加調査

調査日: 2026-09-28。環境変数や秘密情報の実値は記載しません。
対象は現在のワークスペースの `.env.local`、ソース、稼働中のローカルDocker、ローカル `dist/` と、既存WebSocket接続先への接続確認です。
AWSサーバーの環境変数・内部ファイル・稼働プロセス自体は閲覧していません。

後続の [RDS実測・配備コード調査](13-Notification-DB-RDS-Precheck-20260928.md) では、許可後にロリポップの通知PHPとRDSを読み取りました。本資料の環境変数表はローカル調査の結果です。

## 結論

- AWS上に既存WebSocketサーバーがあるとの情報を受領し、設定から決まる接続先への **実Socket.IO接続に成功** しました。ソースがリポジトリ外であることを「WebSocket未実装」とは扱いません。
- 今回読めた `.env.local` はFirebase用の7変数のみです。`VITE_SOCKET_URL`、AWS用変数、PHP配信用変数はありません。ホスト側とDocker側のVite設定解決でも同じ結果でした。
- ユーザー／管理者Socketは `VITE_SOCKET_URL` を参照しますが、未定義のためコードの既定接続先を使います。`.env.local` のFirebase変数をSocket.IOの認証には使っていません。
- PHPは `.env.local` を読みません。現ローカル環境では `api/config/realtime.php` の送信先・共有秘密が有効です。
- **重要な秘密情報の問題:** `src/pages/Login/Login.jsx:36` のパスワード初期値が、PHP設定の2環境のDBパスワードと一致し、ローカルのビルド済みJSにも含まれていました。`VITE_` 経由とは別の露出です。実値は出力していません。

## 1. 環境変数と使用箇所

「定義」は特記しない限り **現在の `.env.local` にあるか** を示します。「なし」はAWS上にも存在しないという意味ではありません。

| 環境変数 | 定義 | 使用ファイル | 用途 | 状態 |
|---|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | あり | `src/firebase/firebaseConfig.js:16`, `firebase-messaging-sw.js:18` | Firebase Web設定 | 使用あり。Socket.IO用の秘密トークンではない |
| `VITE_FIREBASE_AUTH_DOMAIN` | あり | `src/firebase/firebaseConfig.js:17`, `firebase-messaging-sw.js:20` | Firebase Web設定 | 使用あり。TABIのPHPセッション認証とは別 |
| `VITE_FIREBASE_PROJECT_ID` | あり | `src/firebase/firebaseConfig.js:18`, `firebase-messaging-sw.js:22` | Firebase対象プロジェクト | 使用あり。PHPの `FIREBASE_PROJECT_ID` へ自動転送されない |
| `VITE_FIREBASE_STORAGE_BUCKET` | あり | `src/firebase/firebaseConfig.js:19`, `firebase-messaging-sw.js:24` | Firebase Storage設定 | 設定に使用。AWS S3用の `AWS_BUCKET` とは別 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | あり | `src/firebase/firebaseConfig.js:21`, `firebase-messaging-sw.js:26` | Firebase Messaging設定 | 使用あり |
| `VITE_FIREBASE_APP_ID` | あり | `src/firebase/firebaseConfig.js:22`, `firebase-messaging-sw.js:28` | Firebaseアプリ識別 | 使用あり |
| `VITE_FIREBASE_VAPID_KEY` | あり | `src/firebase/firebasePushToken.js:76` | Web Push用の公開VAPIDキーをgetTokenへ渡す | 使用あり。FCM Admin秘密鍵ではない |
| `VITE_SOCKET_URL` | **なし** | `src/pages/userSocket.js:14`, `src/pages/Admin/Realtime/AdminSocket.js:14` | Socket.IO接続先 | コードの既定値にフォールバック。開発・本番の明示的な分離なし |
| `VITE_WS_URL`, `VITE_WEBSOCKET_URL`, `VITE_SOCKET_IO_URL` | なし | 実装からの参照なし | 検索候補名 | 追加しても現在の接続先は変わらない |
| `REALTIME_EMIT_URL` | なし（PHP設定にあり） | `api/Admin/services/realtime.php` | PHP→配信サーバーのHTTP送信先 | PHP専用。現在は `api/config/realtime.php` が優先 |
| `REALTIME_SECRET` | なし（PHP設定にあり） | `api/Admin/services/realtime.php` | `/emit` へのBearer認証 | PHP専用。ブラウザへ渡してはいけない |
| `AWS_ACCESS_KEY_ID` | なし（PHPのaws_storageにあり） | `api/Groups/S3Common.php:41` | AWS S3 APIの認証 | WebSocketユーザー認証には使われていない |
| `AWS_SECRET_ACCESS_KEY` | なし（PHPのaws_storageにあり） | `api/Groups/S3Common.php:42` | AWS S3 APIの秘密資格情報 | サーバー専用。`VITE_` 定義なし |
| `AWS_DEFAULT_REGION` | なし（PHPのaws_storageにあり） | `api/Groups/S3Common.php:43` | S3リージョン | Socket.IOの接続先を選ぶ設定ではない |
| `AWS_BUCKET` | なし（PHPのaws_storageにあり） | `api/Groups/S3Common.php:44` | S3バケット | Socket.IO用ではない |
| `FIREBASE_PROJECT_ID` | なし（ローカルPHPプロセスにもなし） | `api/Notifications/Fcm/FcmConfig.php:54` | PHPからのFCM送信 | `VITE_FIREBASE_PROJECT_ID` とは別にサーバー設定が必要 |
| `GOOGLE_APPLICATION_CREDENTIALS` | なし（ローカルPHPプロセスにもなし） | `api/Notifications/Fcm/FcmConfig.php:55` | Firebase Admin資格情報ファイルの場所 | PHP側FCM送信の必須設定が不足。AWS上の有無は未確認 |
| `FCM_SEND_ENABLED` | なし（ローカルPHPプロセスにもなし） | `api/Notifications/Fcm/FcmConfig.php:57` | PHP側FCM送信の有効化 | このローカル環境では有効にならない |

`.env.local` の7変数はすべてコード内に参照があり、定義だけで未使用の変数はありません。
フロントが参照する独自の `VITE_` 変数のうち、欠けているものは `VITE_SOCKET_URL` です。
`BASE_URL` / `DEV` はVite組み込み値なので `.env.local` にないことは問題ではありません。

## 2. Viteの読み込みと環境切り替え

ホストと `tabi-server-1` の両方で、インストール済みViteの `loadEnv` をdevelopment／productionモードで実行しました。出力は変数名・定義の有無だけです。
両モードともFirebaseの7変数が読み込まれ、`VITE_SOCKET_URL` は未定義でした。関連変数についてViteコンテナのPID 1の環境にも上書き定義はありませんでした。
稼働中Viteが返す `userSocket.js` の変換済みモジュールもHTTP 200で読み取り、埋め込まれた環境変数の名前だけを検査しました。こちらもFirebaseの7変数のみで、`VITE_SOCKET_URL` は未定義でした。
プロジェクト直下で見つかった環境ファイルは `.env.local` だけです。`vite.config.js` には `envPrefix` の変更、全変数をフロントへ埋め込む `define`、独自dotenv読み込みはありません。

Viteは `.env.local` を開発専用として扱うわけではなく、productionビルドでも読み込みます。モード別ファイルが共通ファイルより優先され、起動時のプロセス環境はさらに優先されます。値の変更後は開発サーバーの再起動、本番は再ビルドが必要です。[Vite公式: Env Variables and Modes](https://vite.dev/guide/env-and-mode)

したがって現在のコードでは、「開発ならローカルWS、本番ならAWS」という自動切り替えはありません。
このチェックアウトでは両方とも既定接続先です。実デプロイ時のCI環境変数やAWS上の設定は別途確認が必要です。

## 3. 実際のWebSocket接続仕様

接続先の実文字列は記載せず、参照元・一致判定・プロトコルを報告します。

| 項目 | 確認結果 |
|---|---|
| ホスト | `[WebSocketホスト: 伏字]`。現在は `userSocket.js` / `AdminSocket.js` の既定値。PHPの実効送信先ホストとも一致 |
| AWS上の存在 | ユーザーからAWS上に既存サーバーがあるとの情報あり。既定接続先への接続成功を追加確認。EC2/ALB/API Gateway等の具体的構成は未確認 |
| プロトコル | クライアント入力URLはHTTPS、実通信は **WSS** |
| 方式 | **Socket.IO**。ブラウザ標準WebSocketの独自JSONサーバーではない |
| transport | `websocket` 固定。ポーリングへのフォールバックなし |
| Engine.IO path | 設定未指定なので `/socket.io`、通信URLでは末尾スラッシュ付き `/socket.io/` |
| namespace | `/`。ユーザー用と管理者用で独自namespaceを指定していない |
| 外部ポート | 443。内部プロセスの待受ポートは未確認 |
| 接続成功 | Nodeの `socket.io-client` から実接続成功。TLS証明書検証を無効化せず接続 |
| 認証 | 接続テストはauthトークン・Cookieを指定せず成功。**ルーム入室権限があることを示す結果ではない** |
| 検証していない操作 | join_user / join_trip / 管理者入室、通知送信、他ユーザーの通知閲覧は行っていない |

接続成功イベントだけを確認後、直ちに切断しました。サーバーから来る任意の通知本文や接続IDは出力していません。
Nodeクライアントと実ブラウザではOrigin・Cookieの扱いが異なるため、実ブラウザの接続・認可・配信確認は引き続き必要です。

## 4. フロントの参照関係

- `userSocket.js`: `import.meta.env.VITE_SOCKET_URL` を参照し、未定義なら既定URLで `io()` を作成。
- `AdminSocket.js`: 同じ変数と既定URLを参照。ユーザーSocketとは別インスタンス。
- `UserRealtimeListener.jsx`: `.env.local` の変数を直接使わず、`getUserSocket()` を呼ぶ。`BASE_URL` はwhoami APIのパス、`DEV` は開発ログ制御用。
- `App.jsx`: Vite組み込みの `BASE_URL` をRouterのbasenameへ渡し、`UserRealtimeListener` を配置。AWS資格情報やFirebase認証をSocketへ渡す処理はない。
- `UserRealtimeListener` のwhoamiはPHPセッションを確認した後、`join_user` にuserIdを送る。ブラウザで取得したuserIdを送るだけでサーバー側の認証を満たすとは断定できない。
- `notification_created` を `user:notification_created` に変換し、通知一覧とベルが本人限定のAPIを再取得する。

現在確認できた流れは次の通りです。

```text
.env.local（Firebase用7変数）
  ├─ firebaseConfig / firebase-messaging-sw / firebasePushToken → FCM側
  └─ VITE_SOCKET_URLは未定義
       → userSocket.jsの既定接続先
       → AWS上の既存WebSocket接続先（実Socket.IO接続PASS）
       → UserRealtimeListenerのnotification_created購読
       → 一覧・未読件数API再取得（コード上の接続を確認）
```

「.env.localにAWS資格情報があるのでWebSocket認証も済んでいる」というつながりは、現在のファイルからは確認できません。

## 5. PHP側の設定経路

`api/Admin/services/realtime.php` にdotenv読み込みはありません。`.env.local` がDockerへマウントされていても、それだけではPHPの環境変数にはなりません。
`compose.yaml` に `.env.local` をPHPへ注入する `env_file` 指定もありません。

`REALTIME_EMIT_URL` / `REALTIME_SECRET` の実効優先順位:

1. PHPプロセスの `getenv()`（前回の修正で最優先にした経路）
2. `api/config/realtime.php` の `realtime_url` / `realtime_secret`
3. `realtime_app_config()` のフォールバック。管理APIでは `app_config()` があり、`api/config/env.php` から読んだ `$config`、環境変数、既定値の順

現ローカルDockerでは `REALTIME_EMIT_URL` / `REALTIME_SECRET` のプロセス環境は未設定で、`api/config/realtime.php` にある非空値が使用されます。
`env.php` にも `REALTIME_EMIT_URL` があり、別設定ファイルの送信先と一致しました。
`env.php` の `REALTIME_SECRET` は空で、`realtime.php` 側は非空です。現在は優先順位により送信設定を取得できますが、片方だけ変更すると意図した値が使われない可能性があります。
この設定の二重管理は注意点として残します。今回、実値の変更やAWS設定の書き換えはしていません。

PHPの実効送信URLについて、HTTPS、`/emit`、外部443、フロントの既定ホストとの一致をメモリー内で確認しました。
PHP→`/emit` の認証は共有秘密をBearerヘッダーに入れる方式です。これは**配信を依頼するサーバーの認証**であり、Socket.IO接続ユーザーの認証とは別です。

AWS S3設定は `api/Groups/S3Common.php` が `env.php` の `aws_storage` →トップレベル設定→ `getenv()` の順で参照します。Socket.IOへのAWS署名や認証トークンには使用していません。
FCM設定は `FcmConfig::fromEnvironment()` がPHPプロセス環境を直接読みます。`VITE_FIREBASE_*` や `env.php` の任意キーを自動変換しません。

## 6. 秘密情報の露出

### VITE_定義の確認

現在の `.env.local` にAWS Secret Access Key、DBパスワード、管理者用秘密トークン、Firebase Admin秘密鍵、WebSocket内部共有秘密を `VITE_` として定義した箇所はありません。
定義名と値の秘密鍵形式もチェックしました。秘密鍵PEMやサービスアカウントのprivate_keyを含むVite設定は検出しませんでした。

`VITE_` 値はフロントへ組み込まれるため、内部用秘密値を入れてはいけません。[Vite公式](https://vite.dev/guide/env-and-mode)
Firebase Webの構成情報やFirebase APIキーは通常クライアントで使用する設定です。管理者秘密鍵と同一ではありません。API制限・Firebase Security Rulesの正しさは別途必要で、今回クラウド設定までは確認していません。[Firebase公式: API keys](https://firebase.google.com/docs/projects/api-keys)

### 別経路で見つかった重要な問題

| 項目 | 確認結果 | 対応状況 |
|---|---|---|
| `src/pages/Login/Login.jsx:36` | password stateの初期値に固定の非空文字列がある | 現状を報告。今回の設定調査では変更していない |
| PHP設定との一致 | 上記初期値が `api/config/env.php` 内の `connections.lolipop.DB_PASSWORD` と `connections.aws.DB_PASSWORD` に一致 | 実値は表示せず、完全一致で照合 |
| ローカル `dist/` | 同じ文字列をビルド済みJS内で検出 | ブラウザ向け成果物に含まれることを確認 |
| `REALTIME_SECRET` / `AWS_SECRET_ACCESS_KEY` | 現ローカル設定の値との完全一致はローカルdist内に検出しない | 他環境・過去成果物・未知の資格情報まで安全と保証するものではない |

DB接続を試してパスワードの有効性を検証したわけではありません。PHP設定が現役であればDB資格情報の露出です。公開サイトに同じビルドが配備済みかは未確認です。
対応として、ログインフォームの資格情報初期値を空にし、該当するDB資格情報を運用環境でローテーションし、影響するPHP設定を更新する必要があります。再ビルドだけで既に公開された秘密値を無効にすることはできません。
この調査では、秘密値の変更・ログイン画面の変更・本番配備・本番DB操作は行っていません。

## 7. 管理者通知の接続状況

```text
管理者NoticeForm
  → PHP Admin API（管理者セッションを検証）
  → DBへお知らせ・通知・宛先をcommit
  → noticePublishRealtime → realtime.php
      設定: PHP環境 / api/config/realtime.php / api/config/env.php
  → HTTPS /emit（共有秘密で認証する設計）
  → AWS上の既存Socket.IOサーバー
  → user:<ID>ルームのSocket
  → UserRealtimeListener
  → user:notification_created
  → NotificationListPage / useUnreadNotificationBadge
  → 本人のList / UnreadCount APIを再取得
```

| 確認範囲 | 状態 |
|---|---|
| `.env.local` の変数名・参照関係・Viteの設定解決 | PASS。値を出さず確認 |
| PHPの設定選択・フロントとの接続先ホスト一致 | PASS。ローカル環境で確認 |
| DB保存・対象分離・本人限定API・HTTP送信依頼 | 前回の39項目テストPASS。送信先はスタブ |
| AWS上の既存接続先へのWSS／Socket.IO接続 | **追加でPASS**。ルームには未参加 |
| 本番 `/emit` の認証成功と実通知配信 | 未確認。本番への通知作成・送信は行っていない |
| サーバー側のjoin_user認可・複数接続・ログアウト失効 | 未確認。接続成功だけから認可済みとはしない |
| 実ブラウザA/Bの通知一覧・未読数までの一連の動作 | 未確認。コード上の経路は接続済み |

サーバーの存在・通信路の接続成功・入室認可・実配信の4点を分けて報告します。環境ファイルを見ずに固定値だけから判断した前回の確認範囲を、この追加調査で補足しました。
