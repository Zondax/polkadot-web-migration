import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      all: true,
      exclude: ['e2e/**', 'node_modules/**', '.next/**', 'vitest.config.ts', 'components/ui/**'],
    },
    reporters: ['default', 'html'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      config: path.resolve(__dirname, './config'),
      state: path.resolve(__dirname, './state'),
      lib: path.resolve(__dirname, './lib'),
    },
  },
})
