import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // BUILD_ENV must be 'node' so http_request.ts branches to node-fetch
    // rather than window.fetch (which does not exist in the test runner).
    env: { BUILD_ENV: 'node' }
  }
});
