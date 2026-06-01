import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const invoiceJsonPath = resolve(currentDir, 'src/pages/Invoice/Invoice.json')

function invoiceJsonApi() {
  return {
    name: 'invoice-json-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.replace(/^\/TABI/, '')

        if (url !== '/api/invoices') {
          next()
          return
        }

        if (req.method === 'GET') {
          const json = await readFile(invoiceJsonPath, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(json)
          return
        }

        if (req.method === 'POST') {
          let body = ''

          req.on('data', (chunk) => {
            body += chunk
          })

          req.on('end', async () => {
            try {
              const data = JSON.parse(body)
              await writeFile(invoiceJsonPath, `${JSON.stringify(data, null, 2)}\n`)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), invoiceJsonApi()],
  base: '/TABI/'
})
