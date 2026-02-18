import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Read port configuration from environment variables
const port = parseInt(process.env.VITE_PORT || '5173', 10)
const apiPort = parseInt(process.env.VITE_API_PORT || '8000', 10)
const apiTarget = `http://localhost:${apiPort}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/static': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/admin': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/wilco-static': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
