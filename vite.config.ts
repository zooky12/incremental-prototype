import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Required fix: PixiJS v8 uses top-level await in renderer detection
  // which breaks Vite's pre-bundling without this entry
  optimizeDeps: {
    include: ['pixi.js'],
  },
})
