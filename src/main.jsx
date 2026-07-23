/**
 * React アプリを HTML に取り付け、ブラウザ上で表示を開始する入口です。
 *
 * 主な流れ:
 * 1. React 本体・UIライブラリ(Mantine)・全体CSS・アプリ本体(App)を読み込む
 * 2. エラーを自動報告する仕組み(systemErrorReporter)を起動する
 * 3. index.html の <div id="root"> に React アプリを描画する
 *
 * 扱うデータ: このファイル自体はデータを扱わず、アプリの起動だけを担当します。
 */
// React の開発時チェック機能(StrictMode)を読み込みます。
import { StrictMode } from 'react'
// React 18 以降の描画開始用関数を読み込みます。
import { createRoot } from 'react-dom/client'
// UIコンポーネントライブラリ Mantine の設定プロバイダを読み込みます。
import { MantineProvider } from '@mantine/core'
// Mantine のスタイルと、アプリ全体の共通CSSを読み込みます。
import '@mantine/core/styles.css'
import './index.css'
// アプリ本体(ルーティングを含む最上位コンポーネント)を読み込みます。
import App from './App.jsx'
// 画面で起きたJSエラーを自動でサーバーへ報告するリスナーを読み込みます。
import { installSystemErrorListeners } from './services/systemErrorReporter'

// 画面描画より先にエラー監視を開始し、起動直後のエラーも取り逃さないようにします。
installSystemErrorListeners()

// index.html の <div id="root"> を React の描画先として取得し、アプリを表示します。
// StrictMode: 開発中に問題のある書き方を警告してくれる React の仕組みです。
// MantineProvider: Mantine のUI部品がテーマ設定を参照できるようにする土台です。
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MantineProvider>
            <App />
        </MantineProvider>
    </StrictMode>,
)
