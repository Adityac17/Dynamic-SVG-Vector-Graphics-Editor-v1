import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Dynamic-SVG-Vector-Graphics-Editor-v1/',
  plugins: [react()],
  server: { port: 3000, open: true },
})
