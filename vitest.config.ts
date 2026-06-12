import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // The gallery harness uses Playwright (`*.spec.ts`), run separately via
    // `playwright test` — keep it out of the vitest run.
    exclude: [...configDefaults.exclude, 'packages/gallery-harness/**'],
  },
});
