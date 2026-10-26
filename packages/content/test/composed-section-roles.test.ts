import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { parse } from '@refrakt-md/runes';
import {
	composedStorytelling as composedWith,
	definitionOf,
	fixtureOf,
	pageContext,
} from './composed-storytelling.js';

/**
 * WORK-653 — the composed storytelling runes placing `section` raise no
 * `slot-header-role` warning (ADR-046 decision 3).
 *
 * Each template writes the name as a heading and places `{% metablock %}`
 * between it and the `description` slot, so `section` reads the name as its
 * headline and no slot as its eyebrow or blurb. Checked through the page's own
 * validation, against every fixture of each rune.
 */

const FIXTURES = {
	character: ['canonical', 'portrait', 'body-and-sections'],
	realm: ['canonical', 'body-and-sections', 'defaults'],
	faction: ['canonical', 'body-and-sections', 'defaults'],
} as const;

const pkg = composedWith(
	Object.fromEntries(Object.keys(FIXTURES).map((rune) => [rune, definitionOf(rune)])),
);
const { schemas } = pageContext(pkg);

const slotRoleFindings = (source: string) =>
	Markdoc.validate(parse(source), {
		...schemas,
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never).filter((f) => f.error.id === 'slot-header-role');

describe('composed storytelling on section — no slot-header-role (WORK-653)', () => {
	for (const [rune, scenarios] of Object.entries(FIXTURES)) {
		it.each(scenarios)(`${rune}: %s`, (scenario) => {
			expect(slotRoleFindings(fixtureOf(rune, scenario))).toEqual([]);
		});
	}

	it('would report a description placed straight after the name', () => {
		// The control: without the metablock between them, `section` reads the
		// description's first paragraph as its blurb, and the audit says so.
		const bare = composedWith({
			character: definitionOf('character').replace('\t{% metablock name="metadata" /%}\n\n', ''),
		});
		const findings = Markdoc.validate(parse(fixtureOf('character', 'portrait')), {
			...pageContext(bare).schemas,
			variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
		} as never).filter((f) => f.error.id === 'slot-header-role');
		expect(findings.map((f) => f.error.message)).toEqual([
			'slot `description` of `character` is read as `section`\'s blurb; name the field `blurb`, or set `header="headline"` on the section',
		]);
	});
});
