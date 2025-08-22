import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    alias: {
      vscode: new URL('./test/mocks/vscode.ts', import.meta.url).pathname
    }
  },
});