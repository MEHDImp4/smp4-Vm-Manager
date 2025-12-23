import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'], // Use only text reporter for speed
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/types/**',
        '**/__tests__/**', // Skip test files
        '**/*.test.{ts,tsx}', // Skip test files
        '**/*.spec.{ts,tsx}', // Skip spec files
        '**/test-utils.{ts,tsx}', // Skip test utilities
        'src/components/ui/**', // Skip UI component coverage (shadcn/ui)
        'src/hooks/**', // Skip hooks coverage
        '*.config.{js,ts}', // Skip config files
        'src/main.tsx', // Skip entry point
        'src/vite-env.d.ts', // Skip env types
        '**/constants.{ts,tsx}', // Skip constants
      ],
      // Skip full instrumentation for faster coverage
      all: false,
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
