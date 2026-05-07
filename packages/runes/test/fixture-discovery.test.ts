import { describe, it, expect } from 'vitest';
import { discoverPluginFixtures } from '../src/plugins.js';

describe('discoverPluginFixtures', () => {
	it('returns empty object for non-existent packages', async () => {
		const result = await discoverPluginFixtures('nonexistent-package-that-doesnt-exist');
		expect(result).toEqual({});
	});

	it('returns empty object for packages without fixtures/ directory', async () => {
		// @refrakt-md/types exists but has no fixtures/ dir
		const result = await discoverPluginFixtures('@refrakt-md/types');
		expect(result).toEqual({});
	});
});
