import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so Electron can load dist/index.html via file:// in production
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
})
