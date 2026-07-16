# イベント設計とルーム設計

## 1. イベント名の命名規則

イベント名は「対象:動作」の形式に統一すると理解しやすくなります。

例:

```text
chat:created
chat:updated
chat:deleted
schedule:created
schedule:updated
schedule:deleted
trip-group:joined
member:online
member:offline
system-error:created
system-error:resolved
```

`message`, `update`, `data` のような意味が広すぎる名前は避けます。

## 2. ルームの種類

### 旅行グループ

```text
trip-group:{groupId}
```

旅行グループ内のチャット、予定、しおりなどに使用します。

### ユーザー個人

```text
user:{userId}
```

個人宛通知、権限変更、強制ログアウトなどに使用できます。

### TABI管理者

```text
admin
admin:system-errors
admin:analytics
```

一般ユーザーを参加させないよう、サーバー側で管理者権限を確認します。

## 3. ペイロード共通項目

```json
{
  "eventId": "一意なID",
  "event": "schedule:updated",
  "groupId": 12,
  "actorUserId": 101,
  "occurredAt": "2026-07-15T10:30:00+09:00",
  "data": {
    "scheduleId": 345
  }
}
```

### 各項目の意味

- `eventId`: 重複受信判定に利用可能
- `event`: イベント種別
- `groupId`: 配信対象の旅行グループ
- `actorUserId`: 操作したユーザー
- `occurredAt`: イベント発生時刻
- `data`: イベント固有データ

## 4. クライアントから受け取った値の扱い

クライアントから次の値を受け取っても、そのまま信用しません。

- `userId`
- `groupId`
- `isAdmin`
- `role`
- 配信先ルーム名

`userId` や権限は認証済みセッション・トークンから確定し、`groupId` への所属をサーバー側で確認します。

## 5. イベント一覧表のテンプレート

実装済みイベントを確認後、次の表を更新してください。

| イベント名 | 送信元 | 受信者 | DB保存 | 主なデータ | 実装状況 |
|---|---|---|---|---|---|
| `trip-group:join` | クライアント | サーバー | なし | `groupId` | 要確認 |
| `chat:created` | サーバー | 同一グループ | あり | `messageId` | 要確認 |
| `schedule:updated` | サーバー | 同一グループ | あり | `scheduleId` | 要確認 |
| `system-error:created` | サーバー | 管理者 | あり | `errorId` | 要確認 |

## 6. ACK・処理結果

クライアントからサーバーへイベントを送る場合、処理結果を返す仕組みを用意するとデバッグしやすくなります。

概念例:

```js
socket.emit('trip-group:join', { groupId }, (response) => {
  if (!response.ok) {
    console.error(response.message);
  }
});
```

返却例:

```json
{
  "ok": false,
  "code": "FORBIDDEN_GROUP",
  "message": "この旅行グループへ参加する権限がありません。"
}
```

## 7. バージョニング

イベント仕様を大きく変更する場合は、イベント名またはペイロードへバージョンを持たせます。

```text
v1:schedule:updated
```

または:

```json
{
  "version": 1
}
```

フロントとサーバーを同時に切り替えられない本番運用では、互換性を考慮します。
