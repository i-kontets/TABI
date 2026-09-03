/**
 * Vite の開発サーバーやビルド時の基本設定をまとめます。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: アプリの設定値や、他のファイルから受け取る値を主に扱います。
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const invoiceJsonPath = resolve(currentDir, 'src/pages/Invoice/Invoice.json')

/**
 * invoiceJsonApi は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function invoiceJsonApi() {
	return {
		name: 'invoice-json-api',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url?.replace(/^\/TABI/, '')

				// ここで条件を確認し、状況に合う処理だけを実行します。
				if (url !== '/api/invoices') {
					next()
					return
				}

				// ここで条件を確認し、状況に合う処理だけを実行します。
				if (req.method === 'GET') {
					const json = await readFile(invoiceJsonPath, 'utf-8')
					res.setHeader('Content-Type', 'application/json')
					res.end(json)
					return
				}

				// ここで条件を確認し、状況に合う処理だけを実行します。
				if (req.method === 'POST') {
					let body = ''

					req.on('data', (chunk) => {
						body += chunk
					})

					req.on('end', async () => {
						// API 通信やデータ処理で失敗する可能性があるため、例外を受け取れる形で実行します。
						try {
							const data = JSON.parse(body)

							await writeFile(
								invoiceJsonPath,
								`${JSON.stringify(data, null, 2)}\n`
							)

							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.end(JSON.stringify({ ok: true }))
							// エラーが起きた場合は、画面にメッセージを出すなど安全な処理に切り替えます。
						} catch {
							res.statusCode = 400
							res.end(JSON.stringify({ ok: false }))
						}
					})

					return
				}

				res.statusCode = 405
				res.end()
			})
		},
	}
}

export default defineConfig({
	plugins: [
		react(),
		svgr(),
		invoiceJsonApi(),
	],

	server: {
		host: true,
		proxy: {
			'/TABI/api': {
				target: 'http://apache',
				changeOrigin: true,
			},
		},
		watch: {
			usePolling: true,
		},
	},

	worker: {
		format: 'iife',
		rolldownOptions: {
			output: {
				entryFileNames: 'firebase-messaging-sw.js',
			},
		},
	},

	build: {
		rolldownOptions: {
			input: {
				main: resolve(currentDir, 'index.html'),
				'firebase-messaging-sw': resolve(currentDir, 'src/firebase/firebase-messaging-sw.js'),
			},
			output: {
				entryFileNames: (chunkInfo) => (
					chunkInfo.name === 'firebase-messaging-sw'
						? 'firebase-messaging-sw.js'
						: 'assets/[name]-[hash].js'
				),
			},
		},
	},

	base: '/TABI/',
})
