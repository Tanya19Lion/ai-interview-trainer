import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/testSetup.ts'],
		exclude: [...configDefaults.exclude, 'e2e/**'],
	},
});
