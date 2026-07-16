# 実装ガイド

## 1. 実装方針

TABIでは、WebSocket接続処理を各ページへ直接コピーせず、共通化します。

推奨候補:

```text
src/
  services/
    websocket/
      socketClient.js
      socketEvents.js
  hooks/
    useWebSocket.js
    useTripGroupSocket.js
```

実際のプロジェクト構成に合わせて配置してください。

## 2. 接続を一か所へ集約する理由

ページごとに接続すると、次の問題が起きます。

- ページ遷移のたびに接続が増える。
- 同じイベントを複数回受信する。
- 切断処理を忘れる。
- 認証情報の付与方法がばらつく。
- URLや再接続設定が重複する。

WebSocketクライアントは原則としてシングルトン、Context、または最上位Providerで管理します。

## 3. 標準WebSocketの概念例

> 実際に標準WebSocketを使用している場合の参考例です。

```js
const socket = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL);

socket.addEventListener('open', () => {
  console.log('WebSocket connected');
});

socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data);
  console.log(payload);
});

socket.addEventListener('close', () => {
  console.log('WebSocket disconnected');
});

socket.addEventListener('error', (error) => {
  console.error('WebSocket error', error);
});
```

## 4. Socket.IOの概念例

> 実際にSocket.IOを使用している場合の参考例です。

```js
import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
  auth: {
    token: '認証情報を安全な方法で設定'
  }
});
```

## 5. Reactでイベントを購読する時の注意

イベントリスナーは必ず解除します。

```js
useEffect(() => {
  const handleUpdated = (payload) => {
    // state更新またはAPI再取得
  };

  socket.on('schedule:updated', handleUpdated);

  return () => {
    socket.off('schedule:updated', handleUpdated);
  };
}, []);
```

悪い例:

```js
useEffect(() => {
  socket.on('schedule:updated', (payload) => {
    // 無名関数のため、同じ参照で解除しにくい
  });
});
```

依存配列がない場合、レンダーごとにリスナーが追加される可能性があります。

## 6. ルーム参加

画面で使用している `groupId` を送信し、サーバー側で所属確認後に参加させます。

クライアント側の概念例:

```js
socket.emit('trip-group:join', {
  groupId
});
```

サーバー側の処理:

1. 接続ユーザーを認証する。
2. `groupId` を数値として検証する。
3. DBまたはキャッシュでグループ所属を確認する。
4. 所属している場合だけルームへ参加させる。
5. 不正な場合はエラーを返し、参加させない。

## 7. API保存後の通知

推奨:

```text
APIへ保存
  ↓
DB保存成功
  ↓
WebSocket通知
  ↓
他クライアントが更新
```

非推奨:

```text
WebSocket通知
  ↓
画面だけ更新
  ↓
DB保存に失敗
```

後者では、ユーザーの画面には反映されているのに、再読み込みすると消える問題が起きます。

## 8. 自分自身への反映

更新した本人の画面をどう扱うかは、イベントごとに決めます。

### 方法A: 自分を含めて配信

サーバーから全員へ同じイベントを送り、すべて同じ処理にします。

利点:

- 処理を統一しやすい。
- サーバー確定値を全員へ返せる。

注意:

- 先にローカルstateを更新すると二重追加になる場合がある。

### 方法B: 自分以外へ配信

操作した本人はAPIレスポンスで更新し、他ユーザーだけWebSocketで更新します。

利点:

- 本人側の即時表示がしやすい。

注意:

- 本人と他ユーザーで処理経路が異なる。
- Socket.IOでは `socket.to(room).emit(...)` と `io.to(room).emit(...)` の違いに注意する。

## 9. 再接続

スマートフォンでは接続が頻繁に切れることを前提にします。

再接続後に必要な処理:

- 認証状態の再確認
- 旅行グループのルームへ再参加
- 切断中に失った更新の再取得
- 表示中データのAPI再フェッチ

WebSocketは切断中のイベントを自動的に永続保存しません。重要な更新はDBから再取得します。

## 10. 重複イベント対策

同じ通知を複数回受信しても壊れない実装を意識します。

対策例:

- IDで既存データを置換する。
- 配列へ無条件に `push` しない。
- `eventId` や更新日時を持たせる。
- API再取得に寄せる。
- リスナー解除を徹底する。

## 11. エラー処理

最低限、以下を区別してログへ出します。

- 接続失敗
- 認証失敗
- ルーム参加失敗
- 不正なイベントデータ
- DB保存失敗
- 配信失敗
- 再接続開始
- 再接続成功
- 再接続上限到達
