# TABI 向け Copilot 指示

## ビルド・Lint・テストコマンド

コマンドはリポジトリルートで実行する。

- 依存関係のインストール: `npm install`
- ローカル開発サーバー起動: `npm run dev`
- Lint 実行: `npm run lint`
- 本番ビルド作成: `npm run build`
- 本番ビルドのローカル確認: `npm run preview`
- README のデプロイ手順では、ビルド後の `dist/` の中身をホスティング先へアップロードする前提。

このリポジトリには現在、自動テスト用スクリプト（`npm test` / `npm run test`）が定義されていないため、単体テストを1件だけ実行する手順は未整備。

## 高レベルアーキテクチャ

- Vite + React の SPA。エントリーポイントは `src/main.jsx` で、`StrictMode` 内で `App` を描画する。
- ルーティングは `src/App.jsx` に集約され、`BrowserRouter` で以下4ルートを管理する。
  - `/` -> `Login`
  - `/Newreg` -> `Newreg`
  - `/Home` -> `Home`
  - `/Itinerary` -> `Itinerary`
- 配備パス設定は次の2箇所で連動している。
  - Vite の base: `vite.config.js`（`base: '/TABI/'`）
  - Router の basename: `BrowserRouter basename={import.meta.env.BASE_URL}`
  ホスティング先のパスやリポジトリ名を変更する場合は、この2つをそろえて更新する。
- 現在の機能フローはクライアント側完結（バックエンド API 未接続）。
  - `Login` / `Newreg` は資格情報入力後に `useNavigate` で画面遷移する。
  - `Newreg` は `components/Zxcvbn/Password.jsx` を使ってパスワード強度と再入力一致を検証する。
  - `Home` は価値観すり合わせ UI（`components/chchch/Chchch.jsx`）を表示する。
  - `Itinerary` は現時点では簡易的な土台ページ。

## このコードベース固有の主要ルール

- ページ／コンポーネントのスタイルは CSS Modules（`*.module.css`）を使い、`styles` として import する。
- インデントのタブは半角スペース4つ分として扱う。
- 共通カラーは `src/index.css` の CSS 変数（`--main-color`, `--sub-color`, `--btn-color`, `--other-color`）を利用する。新規スタイルでも可能な限りこのトークンを再利用する。
- `PasswordInput` の親子連携はコールバックのオブジェクト形を前提にしている。
  - `{ password, confirm, isValid }`
  `Newreg` などの親フォーム側はこの形で受け取る実装に合わせる。
- パスワード強度判定は `zxcvbn` を使い、`score >= 2` を最低ラインとして扱う。
- UI 文言は日本語が中心。新規追加や修正時も言語トーンを日本語でそろえる。
