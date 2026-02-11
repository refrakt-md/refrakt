import { describe, it, expect } from 'vitest';
import { resolveVirtualId, loadVirtualModule, VIRTUAL_IDS } from '../src/virtual-modules.js';

describe('resolveVirtualId', () => {
	it('resolves virtual:refract/theme', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.theme)).toBe('\0virtual:refract/theme');
	});

	it('resolves virtual:refract/tokens', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.tokens)).toBe('\0virtual:refract/tokens');
	});

	it('resolves virtual:refract/config', () => {
		expect(resolveVirtualId(VIRTUAL_IDS.config)).toBe('\0virtual:refract/config');
	});

	it('returns undefined for unrelated module IDs', () => {
		expect(resolveVirtualId('svelte')).toBeUndefined();
		expect(resolveVirtualId('./some-file.js')).toBeUndefined();
		expect(resolveVirtualId('@refract-md/svelte')).toBeUndefined();
	});

	it('returns undefined for partial matches', () => {
		expect(resolveVirtualId('virtual:refract/other')).toBeUndefined();
		expect(resolveVirtualId('virtual:refract/')).toBeUndefined();
	});
});

describe('loadVirtualModule', () => {
	const config = {
		contentDir: './content',
		theme: '@refract-md/theme-lumina',
		target: 'sveltekit',
	};

	it('generates theme re-export', () => {
		const result = loadVirtualModule('\0virtual:refract/theme', config);
		expect(result).toBe("export { theme } from '@refract-md/theme-lumina';");
	});

	it('generates tokens CSS import', () => {
		const result = loadVirtualModule('\0virtual:refract/tokens', config);
		expect(result).toBe("import '@refract-md/theme-lumina/tokens.css';");
	});

	it('generates config export', () => {
		const result = loadVirtualModule('\0virtual:refract/config', config);
		expect(result).toContain('export default');
		const parsed = JSON.parse(result!.replace('export default ', '').replace(';', ''));
		expect(parsed).toEqual(config);
	});

	it('returns undefined for unrecognized resolved IDs', () => {
		expect(loadVirtualModule('\0virtual:refract/other', config)).toBeUndefined();
		expect(loadVirtualModule('some-random-id', config)).toBeUndefined();
	});

	it('works with different theme package names', () => {
		const customConfig = { ...config, theme: '@refract-md/theme-aurora' };
		expect(loadVirtualModule('\0virtual:refract/theme', customConfig))
			.toBe("export { theme } from '@refract-md/theme-aurora';");
		expect(loadVirtualModule('\0virtual:refract/tokens', customConfig))
			.toBe("import '@refract-md/theme-aurora/tokens.css';");
	});
});
