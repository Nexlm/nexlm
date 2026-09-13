import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/nexlm_test',
      JWT_SECRET: 'test-secret-that-is-definitely-longer-than-32-characters',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      PLATFORM_SECRET_KEY: `S${'A'.repeat(55)}`,
    },
  },
});
