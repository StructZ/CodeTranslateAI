import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use 'jsdom' to simulate a browser-like environment
    environment: 'jsdom',
    globals: true,
  },
});