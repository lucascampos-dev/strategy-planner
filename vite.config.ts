import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// `base` matches the GitHub Pages project path: https://<user>.github.io/strategy-planner/
export default defineConfig({
  base: '/strategy-planner/',
  plugins: [react()],
  build: {
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/state/**'],
      exclude: ['**/*.test.ts'],
    },
  },
});
