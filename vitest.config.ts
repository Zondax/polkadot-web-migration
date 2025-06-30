import path from 'node:path'
import react from '@vitejs/plugin-react'
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
      exclude: [
        // Infrastructure & config files
        'e2e/**', 
        'node_modules/**', 
        '.next/**', 
        'coverage/**',
        '**/*.config.*',
        'environment.d.ts',
        '**/*.d.ts',
        'vitest.setup*.ts',
        
        // UI library components (shadcn/ui wrappers)
        'components/ui/**',
        
        // Static presentation components
        'components/sections/home/**',
        
        // Type definitions
        'state/types/**',
        'lib/ledger/types.ts',
        
        // Next.js app directory (routes/layouts)
        'app/**',
      ],
      thresholds: {
        global: {
          statements: 50,
          branches: 50,
          functions: 50,
          lines: 50,
        },
      },
    },
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
