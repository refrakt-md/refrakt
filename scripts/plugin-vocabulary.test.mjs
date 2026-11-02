import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBaseline, PLUGINS } from './plugin-vocabulary.mjs';

/** WORK-673 — the first-party plugins' vocabulary baseline stays current. */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('contracts/plugin-vocabulary.json', () => {
	it('matches what the plugins and stylesheets produce today', async () => {
		const committed = JSON.parse(
			readFileSync(join(ROOT, 'contracts', 'plugin-vocabulary.json'), 'utf-8'),
		);
		expect(JSON.parse(JSON.stringify(await buildBaseline()))).toEqual(committed);
	}, 60_000);

	it('covers the nine first-party plugins', async () => {
		const { plugins } = await buildBaseline();
		expect(Object.keys(plugins)).toEqual(PLUGINS.map((p) => `@refrakt-md/${p}`));
	}, 60_000);
});
