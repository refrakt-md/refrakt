import { describe, it, expect } from 'vitest';
import { refrakt } from '../src/integration.js';

describe('refrakt integration', () => {
	it('returns an integration object with correct name', () => {
		const integration = refrakt();
		expect(integration.name).toBe('@refrakt-md/astro');
	});

	it('has astro:config:setup hook', () => {
		const integration = refrakt();
		expect(integration.hooks).toHaveProperty('astro:config:setup');
		expect(typeof integration.hooks['astro:config:setup']).toBe('function');
	});

	it('calls updateConfig with Vite plugin', () => {
		const integration = refrakt();
		const updateConfig = vi.fn();
		integration.hooks['astro:config:setup']({ updateConfig });

		expect(updateConfig).toHaveBeenCalledOnce();
		const config = updateConfig.mock.calls[0][0];
		expect(config.vite).toBeDefined();
		expect(config.vite.plugins).toHaveLength(1);
		expect(config.vite.plugins[0].name).toBe('refrakt-md-astro');
	});

	it('passes options to Vite plugin', () => {
		const integration = refrakt({ configPath: './custom.json' });
		const updateConfig = vi.fn();
		integration.hooks['astro:config:setup']({ updateConfig });

		const plugin = updateConfig.mock.calls[0][0].vite.plugins[0];
		expect(plugin.name).toBe('refrakt-md-astro');
	});
});
