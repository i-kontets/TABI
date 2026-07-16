/**
 * React アプリを HTML に取り付け、ブラウザ上で表示を開始する入口です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import './index.css'
import App from './App.jsx'
import { installSystemErrorListeners } from './services/systemErrorReporter'

installSystemErrorListeners()

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MantineProvider>
            <App />
        </MantineProvider>
    </StrictMode>,
)
