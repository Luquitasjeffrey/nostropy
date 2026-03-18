import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
  },
})
