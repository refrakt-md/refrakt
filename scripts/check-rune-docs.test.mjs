import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import {
	computeDrift,
	loadPackageRunes,
	findDocPages,
	PAGELESS,
	CLI_PATH,
} from './check-rune-docs.mjs';

const pkg = (names, aliases = []) => ({ names: new Set(names), aliases: new Set(aliases) });
const pages = (entries) => new Map(entries.map(([name, isRune, rel]) => [name, { isRune, rel: rel ?? `${name}.md` }]));

describe('computeDrift (WORK-387)', () => {
	it('passes when every documentable rune has a type: rune page', () => {
		const drift = computeDrift(pkg(['hint', 'card']), pages([['hint', true], ['card', true]]), new Set());
		expect(drift).toEqual({ missing: [], orphans: [], mislabelled: [] });
	});

	it('flags a documentable rune with no doc page', () => {
		const drift = computeDrift(pkg(['hint', 'newrune']), pages([['hint', true]]), new Set());
		expect(drift.missing).toEqual(['newrune']);
	});

	it('ignores aliases and PAGELESS runes', () => {
		const drift = computeDrift(pkg(['hint', 'faq', 'accordion-item'], ['faq']), pages([['hint', true]]), new Set(['accordion-item']));
		expect(drift.missing).toEqual([]);
	});

	it('flags an orphan page that declares type: rune with no backing rune', () => {
		const drift = computeDrift(pkg(['hint']), pages([['hint', true], ['removed', true, 'removed.md']]), new Set());
		expect(drift.orphans).toEqual(['removed.md']);
	});

	it('does not flag a concept page (no type: rune) as an orphan', () => {
		const drift = computeDrift(pkg(['hint']), pages([['hint', true], ['surfaces', false]]), new Set());
		expect(drift.orphans).toEqual([]);
	});

	it('flags a rune page that is missing type: rune frontmatter', () => {
		const drift = computeDrift(pkg(['hint']), pages([['hint', false]]), new Set());
		expect(drift.mislabelled).toEqual(['hint']);
	});
});

// Live parity check against the real package set + doc tree. Requires the CLI to
// be built (it queries `inspect --list`); skipped otherwise so an unbuilt local
// checkout doesn't fail spuriously. CI builds before testing, so it runs there.
describe.skipIf(!existsSync(CLI_PATH))('rune docs are in parity (live)', () => {
	it('every documentable rune has a page and every type: rune page has a backing rune', () => {
		const { missing, orphans, mislabelled } = computeDrift(loadPackageRunes(), findDocPages(), PAGELESS);
		expect({ missing, orphans, mislabelled }).toEqual({ missing: [], orphans: [], mislabelled: [] });
	});

	it('no PAGELESS rune actually has a doc page (keeps the known-gaps set honest)', () => {
		const docPages = findDocPages();
		const stale = [...PAGELESS].filter((name) => docPages.get(name)?.isRune);
		expect(stale).toEqual([]);
	});
});
