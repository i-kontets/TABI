# WebSocket認可修正：実装・ステージング検証（2026-09-28）

> この資料は本番切り替え前の検証記録です。後続でRDS・PHP・フロント・AWS認可修正版を本番反映し、PM2の起動判定を追加修正しました。以下の未配備・停止中という記述は当時の状態です。最新の実施結果・障害復旧・残作業は[実行記録18](18-Production-Completion-Record-20260928.md)を優先してください。

## 結果と本番の区別

修正版の接続認証、user/admin/trip/cottage room認可、emit制限は検証環境でPASSです。AWS上の別ディレクトリでも実Socket.IOのテストがPASSしました。

**本番コードは旧実装のままです。監査16の本番FAILはまだ解消していません。** PM2再起動・reload・stop、本番server.js上書き、Nginx・Firewall変更、ロリポップのコード配備、RDS変更、cron操作、本番通知送信は行っていません。ステージング検証後、追加承認に基づく両ホストの署名秘密設定のみ完了しました。その後のユーザー指示により、検証環境の準備完了連絡まで本番操作を停止しています。最新の実施状況は[完成条件と実行記録18](18-Production-Completion-Record-20260928.md)を参照してください。

## 1. 調査と採用方式

- 既存のPHP Sessionのuser_id、有効ユーザー判定、admin_users、group_members、chat_membersを利用。新しいログイン方式は追加しない。
- composer.lockにはfirebase/php-jwtの間接依存記録があるが、調査したローカルのvendor配置には実体がなく、AWSにも既存の利用者JWT認証はなかった。今回は依存配備を増やさず、許可されたPHP hash_hmacとNode cryptoで用途を限定したHMAC-SHA256 tokenを実装した。一般的なJWT検証器としては使用しない。
- emit用共有秘密値と接続認証用secretは分離。AWS起動時に同値なら拒否する。
- tokenの署名は固定仕様のみ。クライアントによるアルゴリズム・issuer・audienceの選択は認めない。

## 2. token仕様

| 項目 | 仕様 |
|---|---|
| API | POST api/auth/WebSocketToken.php、application/json |
| リクエスト | rooms配列のみを権限要求として利用。user_id・roleを送っても本人情報には採用しない |
| 本人ID | PHP Sessionから取得し、usersのactive・未削除を確認 |
| 形式 | base64url(JSON)とHMAC-SHA256署名の2要素 |
| 署名対象 | 固定用途prefix tabi-ws-v1. とbase64url(JSON) |
| claims | v、iss、aud、sub、iat、exp、nonce、rooms |
| v / iss / aud | 1 / tabi-php / tabi-websocketで固定 |
| sub | 本人user_idの正整数文字列 |
| 有効期間 | 120秒。発行時刻の未来ずれは最大5秒まで許容 |
| nonce | random_bytesで毎回生成する16バイト。token識別用で、一回限りの消費管理ではない |
| room上限 | 要求8件＋本人room・管理者room、合計最大10件 |
| token上限 | AWSで4096文字まで |
| 署名比較 | timingSafeEqualによる比較 |
| HTTP応答 | no-store/private。未ログイン・無効ユーザー401、別サイト403、不正入力422、秘密設定不足503 |
| フロント保管 | 接続時のメモリだけ。URL、localStorage、ログへtokenを出さない |

tokenは暗号化ではなく署名です。claimsに秘密情報は入れません。盗まれた有効tokenは期限まで利用され得るため、HTTPS、短寿命、ログ非出力を維持します。nonceは再利用を禁止する仕組みではありません。

## 3. room認可

PHPが許可roomをDBから確定して署名し、AWSは署名済みroom以外への参加を拒否します。

| room | PHP側の判定 | AWS側 |
|---|---|---|
| user:{id} | Session本人IDだけ付与 | 接続直後に本人roomへ自動参加。join_userの別ID要求は拒否 |
| admin:global | 有効ユーザーかつadmin_level>=1 | claimがない一般ユーザーはjoin_admin不可 |
| trip:{id} | acceptedなgroup_membersとactiveなuser_groups | 許可claimと要求IDの一致が必須 |
| cottage:{id} | hotel種別のchatsに対するchat_members | 許可claimと要求IDの一致が必須 |

管理APIの既存ルールは閲覧level>=1、書き込みlevel>=5です。イベント購読は閲覧のため>=1を採用し、書き込み権限を付与しません。管理者user_id=1のlevel=9は両条件を満たします。

既存のtrip roomは名称に反して **group_id** を使います。api/Groups/Create.php、api/Chat/Send.php、UserRealtimeListenerの呼び出しと合わせています。

既存リポジトリにはjoin_cottage呼び出し・cottage roomへのemitがありません。CottageChat画面はAPIポーリングです。そこで予約済みイベントの安全な契約を **cottage:<ホテルチャットのchat_id>** と定義し、既存chat_membersで認可しました。宿泊施設IDを無条件でchat_idとみなす変換は行いません。現行画面のポーリングは変更しません。

要求したtrip/cottageに権限がなければそのroomを署名対象から除外します。本人通知の接続は維持されますが、AWSへのjoinはROOM_FORBIDDENです。不正なroom形式・要求上限超過はAPI全体を拒否します。

期限切れ時はAWSがsocketを切断し、クライアントが新tokenで再接続します。権限・所属の変更は次の発行時に再評価します。即時失効のDB照会は行わず、残存有効期間（通常最大120秒）の遅延があります。

## 4. emit API

POST /emitと既存REALTIME_SECRETを維持します。Bearerスキームを厳密に確認し、秘密値未指定・不一致・生secretだけのAuthorizationは401です。

- roomはuser/trip/cottageの正整数ID、またはadmin:globalだけ。
- roomごとのevent allowlistを追加。PHP送信元とReact購読リストから抽出。
- admin向けはuser/group/post/report/inquiry/notice/spot/manager/system_errorの既存イベント。
- trip/user向けは既存旅行・チャット・投票・日程・チェックリスト・写真・持ち物・精算等の購読イベント。
- notification_createdはuser roomだけ。data.notificationIdは正の安全な整数。
- cottage向けはchat_message_created/updated/deleted。
- dataは省略またはJSONオブジェクト。配列・null・スカラーは拒否。
- HTTP bodyは16KB、Socket.IO packetは8KBまで。未知イベント・不正入力は400。
- 認証付きで指定roomへ送信し、全体broadcastへフォールバックしない。
- ログは固定された処理種別だけ。token・Cookie・本文・秘密値を出力しない。

## 5. Reactと既存クライアントの移行

src/api/authenticatedSocket.jsをuser/admin両方の共通接続処理としました。接続・再接続ごとにSession付きPOSTでtokenを取得し、Socket.IOのauthで送ります。

- API待ち時間上限8秒。取得失敗は最大5回、指数バックオフで再試行。401/403は接続を停止。
- ログアウト・アカウント変更・画面アンマウント時は古い接続と取得中リクエストを破棄。
- 期限切れ切断後は新tokenで接続。再接続時に通知一覧・未読を再取得し、現在のtrip roomにも再参加。
- trip画面が変われば必要roomを変更し、PHPの所属判定を取り直す。
- APIからSession本人IDも返し、短い配備移行期間のため旧join_userイベントを送る。新AWSでは署名済みIDとの一致が必要で、認証根拠としてクライアント指定IDを信用しない。

互換性は **新PHP token API＋新フロント＋旧AWS** と **新PHP token API＋新フロント＋新AWS** を検証しました。旧フロントはtokenを送らないため、新AWSで拒否されます。認証なしの救済経路は設けず、利用者の完全再読み込みが必要です。新フロントを先に反映し、旧サーバーの脆弱な状態で運用する期間を最小限にします。

## 6. 変更ファイル

| ファイル | 内容 |
|---|---|
| deployment/websocket/server.mjs | AWS候補。認証必須、期限切れ切断、room判定、emit検証 |
| deployment/websocket/auth.mjs | 固定HMAC token検証、Bearer、event allowlist |
| deployment/websocket/package.json / package-lock.json | ローカル検証依存を固定。本番へのnpm installは行わない |
| deployment/websocket/auth.test.mjs | 実Socket.IO・HTTP・署名のテスト |
| deployment/websocket/client.test.mjs | 共通React接続処理の競合・更新テスト |
| api/auth/WebSocketAuth.php | Session本人IDに基づくDB認可と署名 |
| api/auth/WebSocketToken.php | Session付きtoken発行API |
| api/auth/tests/websocket_auth_integration.php | ローカルDocker DBと実APIの検証 |
| src/api/authenticatedSocket.js | token取得・再接続共通処理 |
| src/pages/userSocket.js | 共通認証接続を利用 |
| src/pages/UserRealtimeListener.jsx | 本人room互換、現在tripの認可・再参加 |
| src/pages/Admin/Realtime/AdminSocket.js | 共通認証接続を利用 |
| src/pages/Admin/Realtime/AdminRealtimeListener.jsx | アカウント切り替え・アンマウント時切断 |
| api/Notifications/tests/browser_integration.mjs | PHP署名の検証、新旧AWS挙動の回帰テスト |
| scripts/stage_websocket_auth.py | 許可済みAWS非稼働領域への配置・検証。プロセス不変照合 |
| scripts/prepare_notification_release.py | 新PHP2ファイルを配備候補へ追加 |

開発用固定ログイン情報は変更していません。

## 7. AWSステージング

配置先：`/home/ubuntu/tabi-ws-staging/20260928T052128Z-auth/`

- server.mjs、auth.mjs、auth.test.mjs、package.json、package-lock.jsonを配置。
- 現行ソースを同ディレクトリのserver.js.beforeへ退避。.envや秘密鍵はコピーしない。
- node_modulesは既存AWSプロジェクトへのsymlink。依存の追加・更新なし。
- node --checkを3ファイルで実施。
- テストは毎回生成する検証鍵と127.0.0.1の動的ポート。本番3001や本番secretは使用しない。
- verification.jsonとtest-results.txtに秘密値を含まない結果を保存。
- 前後のPM2 PID 35281、Node PID 35293とプロセス起動tickが一致。
- 現行server.jsと.envの内容不変をハッシュで照合。envハッシュ自体は報告へ出さない。

修正候補はローカルのGit差分と、AWSのserver.js.beforeとの比較でレビューできます。

## 8. テスト結果

| 検証 | 結果 |
|---|---|
| Node接続・room・emit＋クライアント制御＋PHP相互運用 | 16テストPASS |
| PHP Session・DB所属・API | 25項目PASS（公開外の秘密設定読取4項目を追加） |
| 実React＋実PHP通知画面、新AWS挙動 | 8項目PASS |
| 新React＋実PHP通知画面、旧AWSのjoin挙動 | 8項目PASS |
| AWSステージング実Socket.IO | 10テストPASS。PHP相互運用1件はAWSにDockerがないためskip、同項目はローカルPASS |
| Node構文 | AWS上3ファイルPASS |
| 新PHP構文 | 3ファイルPASS |
| 対象JS/JSX・ブラウザテストESLint | PASS |
| npm run build | PASS。既存の大きなchunk警告あり |
| git diff --check | PASS |
| ステージング試験時点の本番プロセス・server.js・.env不変 | PASS（その後の承認済み.env設定は記録18参照） |

依頼の20条件は、未認証・改ざん・期限切れ拒否、本人ID2・別ID999/3、管理者、trip/cottage、emit認証と制限、user2のみ配信、複数タブ、切断後退出をテストで網羅しました。Node側ID2/3/999は隔離サーバー内のfixtureで、本番ユーザーroomには接続していません。

ブラウザ試験はAWS通信をローカルで置換しています。AWSステージングの実サーバー試験と組み合わせていますが、本番PHP→本番AWS→本番user2の連続E2Eではありません。

全体Lintの既存40 errors／10 warningsは前回確認結果で、今回は関係するファイルを対象に検証しました。全体PASSとはしていません。

## 9. 本番切り替え対象と環境変数

新しいローカル配備候補は `dist/notification-release/TABI-notifications.tar.gz`。PHP17ファイル＋フロント24ファイルです。公開外秘密ファイルの読取対応後のSHA-256：`d14708a576d7a0d64b3af453fa6e243a7de53dba80574bab78e68bceef50b5f5`。

フロント参照はmain-D0SXypcF.js、index.esm-hNB43mnu.js、main-Dj9O1BrQ.cssです。

**ロリポップの既存stage-v2／release-v2は認証追加前の旧配備候補です。今回の新フロントと混ぜたり、そのまま最終候補として使ったりしないでください。** 今回ロリポップへ新配備物をアップロードしていません。

AWS切り替え対象はserver.mjsの内容を現行server.jsへ反映することと、同ディレクトリへのauth.mjs追加です。既存依存で動作確認できたため、AWS package.json／依存ライブラリの変更は不要です。

必要な環境変数名：

- WS_AUTH_SECRET（新規。PHPとAWSで共有、サーバー専用）
- REALTIME_SECRET（既存。emit専用で維持）
- PORT（既存）

WS_AUTH_SECRETは十分な乱数で生成し、32バイト以上の長さが必要です。本番値は追加承認後に非表示で生成し、両ホストへ設定済みです。PHPはgetenvを優先し、未設定なら公開領域外の `/home/users/1/mond.jp-genshin/private/TABI/ws-auth-secret` を読みます。パスはAPI配置から公開ルートの親を求めて固定し、リクエストで指定できません。ファイルは権限600とし、他ユーザーの読取権限・symlink・読取不可・設定不在は拒否します。親ディレクトリは700、値の転送はSSH標準入力経由、表示やGit登録は行いません。両側の権限600と値の一致を確認済みですが、対応コードの配備・PM2再起動は未実施です。VITE_設定やJS bundleには置きません。

## 10. 本番配備順（未実行）

1. 実施許可、保守時間、他管理者・手動CLI停止、管理者1と受信者2の独立したログイン環境を確認する。cronは未登録のまま。
2. 最新コード・DBの退避とハッシュ照合。今回のPHP17＋フロント候補をロリポップの非公開領域へ新規配置し、再検証する。
3. 許可後、PHPとAWSへ新しいWS_AUTH_SECRETを安全に設定する。値をチャット・Git・ログに出さない。PHP token APIを先に配置し、Session本人性・no-store・設定読取を確認する。
4. 管理APIの通常・重複経路を書き込み停止。既存手順どおりRDS ALTER・確認、新通知PHPを反映する。
5. 新フロントのassetを先に置き、index.htmlを最後に反映。旧assetは保持。完全再読み込み後、新token APIと既存AWSに接続できることを確認する。
6. AWSの現行PID・ソースハッシュを再照合。auth.mjsとserver.js候補を原子的に配置し、node --checkを行う。秘密設定の読取も値を出さず確認する。
7. 明示許可後、既存PM2アプリを1回だけrestartし、新コードを読み込ませる。forkモードのため無停止reloadを前提にしない。
8. health、未認証拒否、管理者1・本人2の認証接続を確認。旧フロントが拒否される場合は再読み込みする。無認証へ戻す互換処理は追加しない。
9. 排他的なテスト時間を確保して管理API停止を一時解除し、管理者1→user2だけの通知を1件作成。DB宛先、実受信、未読・既読・再読み込み・同一requestKeyを確認する。
10. 問題なければ通常運用再開。cronは起動方式確認後、ユーザーが最後に登録する。

将来実行するPM2操作の候補（**今回は未実行**）：

```sh
cd /home/ubuntu/tabi-ws-server
node --check server.js
pm2 restart tabi-ws-server --update-env
```

この順序はserver.jsの既存パスを維持する前提です。dotenvは既存cwdの.envを読みます。PM2環境に同名変数が存在するとそちらが優先されるため、実値を出さず設定元と一致を確認してから実行します。

WS通信の停止は再起動・再接続分で数秒〜十数秒を見込みますが、本番未実測です。確認失敗時の復旧時間は別に確保します。HTTP通知履歴の定期取得は回復経路として維持します。

## 11. ロールバック（未実行）

- AWSコード切り替え前：本番AWSコードは未変更。署名秘密設定のみ準備済み。token API・新フロントの問題なら、互換性を見て新旧PHP・フロントを一組で戻す。新AWSは起動しない。
- AWS切り替え後：まず通知テスト・管理書き込みを止める。診断情報は秘密値なしで取得し、原則は認証必須を維持した修正版へ切り替える。
- server.js.beforeへ復元してPM2を再起動する技術的復旧は可能だが、既知の未認証room参加問題が再発する。自動実行せず、そのリスクを明示して別途判断・許可を受ける。
- 認証付きサーバーを維持できない場合、無認証再開より一時的なWS停止＋HTTP取得を選択肢とする。サービス停止自体も今回許可されていないため勝手に行わない。
- 旧フロントだけへ戻して新AWSを維持するとtoken不足で接続できない。フロント/API/AWSの組み合わせを必ず確認する。
- RDS追加4列は残し、限定通知保存後の通知・宛先・既読・request_keyを削除しない。新しい公開条件を守る通知APIは維持する。

## 12. 残課題と停止位置

本番secretの安全な設定は完了しました。旧フロントの完全再読み込み、AWS切り替え時の実停止時間、必要なら即時失効方式、ロリポップcron起動方式が運用上の残課題です。

既存PM2のsystemdユニット非稼働と3001の全インターフェース待受も今回変更していません。OS再起動後の復旧やFirewall確認は別途対象です。

本番のRDS ALTER、ロリポップ配備、AWS server.js切り替えとPM2再起動、本番通知送信は承認済み範囲が確定していますが、**ユーザーの検証環境準備完了連絡まで停止** します。署名秘密設定だけは停止連絡前に完了済みです。最新状況・停止条件は記録18を優先してください。
