import { describe, it, expect } from 'vitest';
import { migrateCtaSource } from '../src/commands/migrate.js';

/** WORK-703 — the composed `cta` declares no `call-to-action` alias. */
describe('refrakt migrate cta', () => {
	it('renames the opening and closing tags', () => {
		const { text, count } = migrateCtaSource(
			'{% call-to-action align="start" %}\n# Go\n{%- /call-to-action %}',
		);
		expect(text).toBe('{% cta align="start" %}\n# Go\n{%- /cta %}');
		expect(count).toBe(2);
	});

	it('leaves prose and other tags alone, and is idempotent', () => {
		const source = 'A call-to-action band.\n\n{% cta %}\n# Go\n{% /cta %}';
		expect(migrateCtaSource(source)).toEqual({ text: source, count: 0 });
	});
});
