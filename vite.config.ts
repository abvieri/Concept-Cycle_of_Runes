import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '', // Empty string is often safer for relative paths in embedded iframes like itch.io
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})