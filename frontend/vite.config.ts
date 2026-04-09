/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Thresholds commented out until coverage is incrementally built up.
      // Re-enable once sufficient tests exist to meet the 80% target:
      // thresholds: {
      //   branches: 80,
      //   functions: 80,
      //   lines: 80,
      //   statements: 80
      // }
    }
  }
})
