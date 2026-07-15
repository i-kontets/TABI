# インストールとローカル環境構築

## 1. 最初に確認すること

今回の会話履歴では、実際に採用したWebSocketライブラリ名を特定できませんでした。

リポジトリ内で次を確認してください。

- `package.json`
- `package-lock.json`
- `composer.json`
- WebSocketサーバー用ディレクトリ
- `.env` または `.env.local`
- `vite.config.js`
- 起動用スクリプト
- READMEや過去のコミット

代表的な構成は次のいずれかです。

### Node.js側

- Socket.IO
- `ws`
- uWebSockets.js

### PHP側

- Ratchet
- Workerman
- OpenSwoole / Swoole

## 2. インストール済みライブラリの確認

Node.jsの場合:

```bash
npm list --depth=0
```

特定ライブラリを確認する例:

```bash
npm list socket.io socket.io-client ws
```

PHP Composerの場合:

```bash
composer show
```

特定ライブラリを確認する例:

```bash
composer show cboden/ratchet
```

## 3. Socket.IO構成だった場合の例

> 以下は例です。実際にSocket.IOを採用したことが確認できた場合だけ使用してください。

サーバー:

```bash
npm install socket.io
```

Reactクライアント:

```bash
npm install socket.io-client
```

`package.json` の例:

```json
{
  "scripts": {
    "dev": "vite",
    "websocket": "node websocket/server.js"
  }
}
```

起動:

```bash
npm run websocket
npm run dev
```

## 4. ws構成だった場合の例

> 以下は例です。実際に `ws` を採用したことが確認できた場合だけ使用してください。

```bash
npm install ws
```

## 5. Ratchet構成だった場合の例

> 以下は例です。実際にRatchetを採用したことが確認できた場合だけ使用してください。

```bash
composer require cboden/ratchet
```

起動例:

```bash
php websocket-server.php
```

## 6. 環境変数

フロントエンドから参照する値には、Viteの規則に合わせて `VITE_` を付けます。

`.env.local` の例:

```env
VITE_WEBSOCKET_URL=http://localhost:要確認
```

本番例:

```env
VITE_WEBSOCKET_URL=https://ws.example.com
```

重要:

- 秘密鍵を `VITE_` 変数へ入れない。
- `VITE_` の値はブラウザへ公開される。
- 本番URLをソースへ直接書かない。
- `.env.local` はGit管理対象外にする。
- `.env.example` には秘密値を入れない。

`.env.example`:

```env
VITE_WEBSOCKET_URL=
```

## 7. ローカル起動順序

1. DBまたは既存APIを起動する。
2. WebSocketサーバーを起動する。
3. React/Viteを起動する。
4. ブラウザの開発者ツールで接続を確認する。
5. 別ブラウザまたは別端末で同じ旅行グループを開く。
6. 一方の端末で更新し、他方へ反映されることを確認する。

## 8. 同一LAN上のスマートフォンから確認する場合

`localhost` は「その端末自身」を指します。

PCでWebSocketサーバーを動かし、スマートフォンから接続する場合、スマートフォンの `localhost` はPCではありません。PCのLAN内IPアドレスを使用します。

例:

```env
VITE_WEBSOCKET_URL=http://192.168.1.20:要確認
```

必要な確認:

- PCとスマートフォンが同じネットワークにいる。
- WebSocketサーバーが `127.0.0.1` だけでなく外部インターフェースで待ち受けている。
- OSファイアウォールでポートが許可されている。
- Vite側も外部端末からアクセス可能な設定になっている。
- CORSまたはOrigin制限が適切である。

## 9. インストール時によくある間違い

- サーバー用ライブラリだけを入れ、React側クライアントを入れていない。
- ルートとWebSocket用ディレクトリの両方で `npm install` し、依存関係が分散した。
- `npm install` を実行した場所が違う。
- `.env` を変更した後にViteを再起動していない。
- `ws://localhost` をスマートフォンでも使用した。
- Socket.IOクライアントで標準WebSocketサーバーへ接続しようとした。
- Socket.IOサーバーへブラウザ標準の `new WebSocket()` で接続しようとした。

Socket.IOと標準WebSocketは同じものではないため、サーバーとクライアントの方式を揃える必要があります。
