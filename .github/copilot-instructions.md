# TABI用 Copilot 手順書

## ビルド、テスト、Lintコマンド

- **開発サーバー**: `npm run dev` - Vite開発サーバーを起動（デフォルトではポート5173で実行）
- **本番ビルド**: `npm run build` - `dist/`に最適化された静的ファイルを生成
- **Lint**: `npm run lint` - すべての`.js`および`.jsx`ファイルに対してESLintを実行
- **本番ビルドのプレビュー**: `npm run preview` - 本番ビルドをローカルでテスト

**注意**: テストスクリプトは設定されていません。必要に応じて`package.json`に追加してください。

## プロジェクト概要

TABIは、ベースパス`/TABI/`でデプロイされるReactベースの旅行計画Webアプリケーションです。以下を使用しています：
- **React 19**とReact Router v7によるページナビゲーション
- **Vite**ビルドツール
- **ESLint**（React HooksおよびReact Refreshプラグイン搭載）でコード品質を管理
- **CSS Modules**によるコンポーネントスコープスタイリング（ページとコンポーネントは`.module.css`を使用）

## アーキテクチャ

### ページ構成
アプリはReact Routerを使用した複数ページ構成です：
- `/` - ログインページ（`src/pages/Login/Login.jsx`）
- `/Newreg` - 新規登録ページ（`src/pages/newreg/Newreg.jsx`）
- `/Home` - ホームページ（`src/pages/Home/Home.jsx`）
- `/Itinerary` - 旅のしおりページ（`src/pages/Itinerary/itinerary.jsx`）

各ページは`src/pages/`内のスタンドアロンコンポーネントです。ページは`src/components/`から再利用可能なコンポーネントをインポートできます。

### コンポーネント構成
- **ページ**: `src/pages/{PageName}/` - 専用の`.module.css`ファイルを持つフルページコンポーネント
- **コンポーネント**: `src/components/{ComponentName}/` - `.module.css`スタイリングを持つ再利用可能なコンポーネント
- **アセット**: `src/assets/icons/` - SVGアイコンおよびその他の静的アセット

### スタイリングシステム
グローバルカラートークンは`src/index.css`の`:root`にCSS変数として定義されています：
```css
--main-color: #C9D0C7    (ライトニュートラル)
--sub-color: #1B685C     (ティール/グリーン)
--btn-color: #2D4951     (ダークブルー)
--other-color: #7BAD26   (ライムグリーン)
```

**色が指定されていない場合は、これらのCSS変数を使用してください**。`.module.css`ファイルで参照します：
```css
.element {
  color: var(--main-color);
  background: var(--sub-color);
}
```

## 主要な規約

### 命名規則
- **ページ**: PascalCase（例：`Login.jsx`、`Newreg.jsx`）
- **コンポーネント**: PascalCase（例：`Chchch.jsx`、`Password.jsx`）
- **CSSモジュール**: `.module.css`サフィックス付きkebab-case（例：`login.module.css`）
- **フック**: `use`をプレフィックスとして使用（React規約）

### ESLintルール
- 未使用の変数はエラーとしてフラグが立ちます。ただし、大文字またはアンダースコアで始まるものは例外です（パターン：`^[A-Z_]`）
- React Hooksルールが実装されています（依存関係は正しい必要があります）
- React Refreshルールはホットモジュールリローディングに適用されます

### ファイル構成規約
- 各ページは同じディレクトリ内の`.module.css`を通じて独自のスタイリングを持ちます
- コンポーネントはページ間で共有できます。`src/components/`に保存します
- アセット（アイコン、画像）は`src/assets/`に置きます。現在、`src/assets/icons/`にはSVGアイコンのみが存在します

### Reactパターン
- 状態管理には`useState`と`useEffect`を使用します（Redux/Zustandは使用していません）
- ページナビゲーションにはReact Routerの`useNavigate`を使用します
- CSS Modulesをインポートし、テンプレートリテラルでクラスを適用します：`` className={`${styles.class1} ${styles.class2}`} ``
- React StrictModeは本番環境で有効になっています（`src/main.jsx`参照）

## Viteベースパス
アプリは`vite.config.js`で`base: '/TABI/'`でデプロイされます。React Routerを使用する場合、BrowserRouterのbasenameで常に`import.meta.env.BASE_URL`を使用して、このパスを尊重します。

## データベーススキーマ
バックエンド永続化を実装する場合は、`DB.md`を参照してデータベース設計の詳細をご確認ください。

アプリケーションは`npm run dev`での開発時に`http://localhost:5173/TABI/`で実行されます。
