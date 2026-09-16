import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      // Process entry points and generated clients have nothing to assert.
      exclude: ['src/index.js', 'src/lib/prisma.js'],
      reporter: ['text-summary', 'html', 'lcov'],
    },
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/nexlm_test',
      JWT_SECRET: 'test-secret-that-is-definitely-longer-than-32-characters',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      // A throwaway testnet seed so tests can build and sign real transactions.
      PLATFORM_SECRET_KEY: 'SBVYPYFR7LVS6LOFWSUSLOFRFZ2HPTR7WUHJVWZRDPJ5PS3DUCSUPPD4',
    },
  },
});
