import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'demo',
  server: {
    fs: {
      // Allow serving files from parent directory (for src/test-fixtures)
      allow: ['..'],
    },
  },
  build: {
    outDir: '../dist-demo',
  },
})
