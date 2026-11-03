import { describe, it, expect } from 'vitest';
import { migrateHeroSource } from '../src/commands/migrate.js';

/** WORK-702 — the composed `hero` takes `section`'s `start | center | end`. */
describe('refrakt migrate hero', () => {
	it('rewrites left and right to start and end on a hero tag', () => {
		const { text, count } = migrateHeroSource(
			'{% hero align="left" %}\n# A\n{% /hero %}\n\n{% hero align=\'right\' %}\n# B\n{% /hero %}',
		);
		expect(text).toContain('{% hero align="start" %}');
		expect(text).toContain("{% hero align='end' %}");
		expect(count).toBe(2);
	});

	it('renames the deprecated justify to align, mapping its value', () => {
		const { text, count } = migrateHeroSource('{% hero justify="right" media-position="end" %}');
		expect(text).toBe('{% hero align="end" media-position="end" %}');
		expect(count).toBe(1);
		expect(migrateHeroSource('{% hero justify="center" %}').text).toBe('{% hero align="center" %}');
	});

	it('leaves values the composition accepts, and other runes, untouched', () => {
		const source =
			'{% hero align="start" %}\n{% /hero %}\n{% section align="left" %}{% /section %}\n{% cta justify="left" %}';
		expect(migrateHeroSource(source)).toEqual({ text: source, count: 0 });
	});

	it('is idempotent', () => {
		const once = migrateHeroSource('{% hero align="left" %}').text;
		expect(migrateHeroSource(once)).toEqual({ text: once, count: 0 });
	});
});
