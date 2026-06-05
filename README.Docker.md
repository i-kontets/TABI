# React + Vite を Docker Desktop で動かす手順（TABIプロジェクト）

## 1. Docker Desktop のインストール確認

PowerShellで以下を実行。

```powershell
docker version
```

正常にインストールされていれば Docker Client と Server の情報が表示される!

確認した環境例

```text
Docker Desktop 4.76.0
Docker Engine 29.5.2
```

---

## 2. Node.js の確認

PowerShellで実行。

```powershell
node -v
npm -v
```

確認した環境例

```text
Node.js v24.15.0
npm 11.12.1
```

---

## 3. React プロジェクトへ移動

```powershell
cd TABI
```

プロジェクト構成例

```text
TABI
├─ src
├─ public
├─ package.json
├─ vite.config.js
└─ node_modules
```

React + Vite プロジェクトであることを確認。

---

## 4. Docker Init 実行

```powershell
docker init
```

---

## 5. Docker Init のコマンドを打つと以下の質問がくるので以下の回答を選択してね

### 質問1

```
What application platform does your project use?
```

選択

```
Node
```

---

### 質問2

```
What version of Node do you want to use?
```

選択

```
24.15.0
```

（現在使用している Node.js バージョン）

---

### 質問3

```
Do you want to run "npm run build" before starting your server?
```

選択

```
n
```

理由

開発環境では

```bash
npm run dev
```

を利用するため。

---

### 質問4

```
What command do you want to use to start the app?
```

入力

```
npm run dev -- --host
```

理由

Dockerコンテナ外からアクセスできるようにするため。

---

### 質問5

```
What port does your server listen on?
```

入力

```
5173
```

Vite のデフォルトポート。

---

## 6. Dockerfile の修正

Docker Init が生成した Dockerfile は Node サーバー向けだったため修正。
ファイルの内容をすべて以下のコードに置き換えて

最終版

```
FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

---

## 7. compose.yaml のファイルの内容をすべて以下に置き換えて

最終版

```
services:
  server:
    build:
      context: .

    ports:
      - "5173:5173"

    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
```

### volumes の意味

```
- .:/usr/src/app
```

Windows上のソースコードとコンテナ内を同期。

```
- /usr/src/app/node_modules
```

コンテナ内の node_modules を保持。

---

## 8. 起動

```
docker compose up --build
```

成功すると

```
VITE v8.x.x ready

➜ Local: http://localhost:5173/TABI/
```

のような表示になる。

---

## 9. ブラウザで確認

```
http://localhost:5173/TABI/
```

へアクセス。

React画面が表示されれば成功。

---

## 10. 日常的な操作

### Dockerコンテナを作成して起動する

```
docker compose up --build
```

### 起動

```
docker compose up
```

### バックグラウンド起動

```powershell
docker compose up -d
```

### 停止

```powershell
docker compose down
```

### ログ確認

```powershell
docker compose logs -f
```

---

## 11. 開発時の確認

VS Codeで React ファイルを編集し保存。

ブラウザが自動更新されれば Docker + Vite の開発環境構築完了。

---

## 補足

Docker Init が最初に生成した Dockerfile では

```dockerfile
npm ci --omit=dev
```

が使用されていたため、

```text
sh: vite: not found
```

エラーが発生した。

原因は Vite が devDependencies に含まれており、インストールされなかったため。

そのため開発環境では

```dockerfile
RUN npm install
```

を利用する構成へ変更した。
