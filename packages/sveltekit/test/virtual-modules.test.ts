import { describe, it, expect } from 'vitest';
import { resolveVirtualId, loadVirtualModule, VIRTUAL_IDS } from '../src/virtual-modules.js';

describe('resolveVirtualId', () => {
	it('resolves virtual:refrakt/theme', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.theme)).toBe('\0virtual:refrakt/theme');
	});

	it('resolves virtual:refrakt/tokens', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.tokens)).toBe('\0virtual:refrakt/tokens');
	});

	it('resolves virtual:refrakt/config', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.config)).toBe('\0virtual:refrakt/config');
	});

	it('returns undefined for unrelated module IDs', () => {
		expect(resolveVirtualId('svelte')).toBeUndefined();
		expect(resolveVirtualId('./some-file.js')).toBeUndefined();
		expect(resolveVirtualId('@refrakt-md/svelte')).toBeUndefined();
	});

	it('returns undefined for partial matches', () => {
		expect(resolveVirtualId('virtual:refrakt/other')).toBeUndefined();
		expect(resolveVirtualId('virtual:refrakt/')).toBeUndefined();
	});
});

describe('loadVirtualModule', () => {
	const config = {
		contentDir: './content',
		theme: '@refrakt-md/lumina',
		target: 'sveltekit',
	};

	it('generates theme re-export from theme/target adapter', () => {
		const result = loadVirtualModule('\0virtual:refrakt/theme', config);
		expect(result).toBe("export { theme } from '@refrakt-md/lumina/sveltekit';");
	});

	it('generates tokens CSS import from theme/target adapter', () => {
		const result = loadVirtualModule('\0virtual:refrakt/tokens', config);
		expect(result).toBe("import '@refrakt-md/lumina/sveltekit/tokens.css';");
	});

	it('generates config export', () => {
		const result = loadVirtualModule('\0virtual:refrakt/config', config);
		expect(result).toContain('export default');
		const parsed = JSON.parse(result!.replace('export default ', '').replace(';', ''));
		expect(parsed).toEqual(config);
	});

	it('returns undefined for unrecognized resolved IDs', () => {
		expect(loadVirtualModule('\0virtual:refrakt/other', config)).toBeUndefined();
		expect(loadVirtualModule('some-random-id', config)).toBeUndefined();
	});

	it('works with different theme package names', () => {
		const customConfig = { ...config, theme: '@refrakt-md/aurora' };
		expect(loadVirtualModule('\0virtual:refrakt/theme', customConfig))
			.toBe("export { theme } from '@refrakt-md/aurora/sveltekit';");
		expect(loadVirtualModule('\0virtual:refrakt/tokens', customConfig))
			.toBe("import '@refrakt-md/aurora/sveltekit/tokens.css';");
	});
});
