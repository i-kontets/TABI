# 本番デプロイと運用

## 1. 本番環境で追加になる要素

ローカルで動作しても、本番では次が必要です。

- WebSocketプロセスの常時起動
- HTTPSに対応したWSS
- NginxまたはApacheのUpgradeヘッダー転送
- セキュリティグループ・ファイアウォール設定
- Origin制限
- ログ出力
- 異常終了時の自動再起動
- デプロイ時の再起動手順
- 複数台構成の場合の共有基盤

## 2. HTTPSとWSS

本番サイトがHTTPSの場合、WebSocketも通常は `wss://` を使用します。

```text
開発: ws:// または http://
本番: wss:// または https://
```

HTTPSページから `ws://` へ接続するとMixed Contentとして拒否される可能性があります。

## 3. リバースプロキシ

WebSocketサーバーを内部ポートで起動し、外部からは同じHTTPSドメインまたは専用サブドメインで受ける構成が一般的です。

Nginxの概念例:

```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:要確認;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

標準WebSocketで別パスを使う場合:

```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:要確認;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

実際のWebサーバーがApacheの場合は、Apache用設定へ置き換えます。

## 4. プロセス常駐

SSH接続中に次のように起動しただけでは、ログアウト時やプロセス異常時に停止する可能性があります。

```bash
node websocket/server.js
```

本番では次のいずれかで管理します。

- systemd
- PM2
- Supervisor
- Dockerのrestart policy
- 利用中のホスティングが提供する常駐プロセス機能

採用した方式: `要確認`

## 5. AWSで確認する項目

- WebSocketサーバーが動くEC2またはコンテナ
- ALBを使用する場合のリスナーとターゲットグループ
- セキュリティグループ
- Route 53またはDNS
- ACM証明書
- CloudWatch Logs
- ヘルスチェック
- アイドルタイムアウト
- デプロイ方式

RDSはWebSocketの接続先ではありません。WebSocketアプリケーションサーバーがRDSへ接続します。

## 6. ロリポップ環境での注意

一般的な共有レンタルサーバーでは、任意ポートの常時起動プロセスやWebSocketサーバーを自由に動かせない場合があります。

確認項目:

- Node.jsまたは対象PHPランタイムを常駐起動できるか
- 任意ポートを外部公開できるか
- リバースプロキシ設定を変更できるか
- SSH切断後もプロセスを維持できるか
- WebSocket通信が規約・仕様上サポートされるか

対応できない場合は、WebSocketサーバーだけAWSなど別環境へ配置し、既存PHP APIはロリポップに残す構成を検討します。

## 7. スケールアウト

WebSocketサーバーを複数台にすると、接続中ユーザーが別々のサーバーへ分かれます。

```text
ユーザーA → WebSocketサーバー1
ユーザーB → WebSocketサーバー2
```

サーバー1で発生したイベントをサーバー2へ伝える仕組みが必要です。

代表例:

- Redis Pub/Sub
- Socket.IO Redis Adapter
- AWSのマネージドサービス
- メッセージブローカー

初期段階で1台構成なら不要ですが、将来の拡張ポイントとして記録します。

## 8. ログ

最低限記録する項目:

- 接続ID
- ユーザーID
- 接続時刻・切断時刻
- 切断理由
- 参加ルーム
- イベント名
- エラーコード
- 例外内容
- 配信件数
- 処理時間

トークン、パスワード、Cookie全体、個人情報本文をそのままログへ出さないようにします。

## 9. デプロイ手順テンプレート

1. 変更をバックアップまたはGitへ保存する。
2. 依存関係をインストールする。
3. 環境変数を設定する。
4. ビルドが必要なら実行する。
5. WebSocketプロセスを再起動する。
6. プロセス状態を確認する。
7. ログを確認する。
8. `wss://` 接続を確認する。
9. 別端末でリアルタイム更新を確認する。
10. 異常時は直前バージョンへ戻す。
