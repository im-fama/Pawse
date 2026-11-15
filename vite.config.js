import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleGroqRequest, CORS_HEADERS } from './server/groqProxy.js'

// Serves POST /api/groq during development, mirroring the Vercel function
// in api/groq.js, so the Groq key stays server-side in dev too.
function groqDevProxy(env) {
  return {
    name: 'pawse-groq-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/groq', (req, res) => {
        for (const [key, value] of Object.entries(CORS_HEADERS)) {
          res.setHeader(key, value)
        }
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        let raw = ''
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', async () => {
          let body = null
          try { body = JSON.parse(raw) } catch { /* handled as invalid below */ }

          const { status, data } = await handleGroqRequest({
            authHeader: req.headers.authorization,
            body,
            env,
          })
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), groqDevProxy(env)],
    // Relative base so Electron can load dist/index.html via file:// in production
    base: './',
    server: {
      port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 5173,
      strictPort: true,
    },
  }
})
