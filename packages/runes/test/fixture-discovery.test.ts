import { describe, it, expect } from 'vitest';
import { discoverPackageFixtures } from '../src/packages.js';

describe('discoverPackageFixtures', () => {
	it('returns empty object for non-existent packages', async () => {
		const result = await discoverPackageFixtures('nonexistent-package-that-doesnt-exist');
		expect(result).toEqual({});
	});

	it('returns empty object for packages without fixtures/ directory', async () => {
		// @refrakt-md/types exists but has no fixtures/ dir
		const result = await discoverPackageFixtures('@refrakt-md/types');
		expect(result).toEqual({});
	});
});
