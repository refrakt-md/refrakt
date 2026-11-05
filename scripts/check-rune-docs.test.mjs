import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	attributeSections,
	introCoverage,
	computeDrift,
	loadPackageRunes,
	findDocPages,
	PAGELESS,
	CLI_PATH,
	ARTIFACT_PATH,
	REGENERATE_COMMAND,
	attributeCoverage,
	handWrittenTables,
} from './check-rune-docs.mjs';

const pkg = (names, aliases = []) => ({ names: new Set(names), aliases: new Set(aliases) });
const pages = (entries) =>
	new Map(entries.map(([name, isRune, rel]) => [name, { isRune, rel: rel ?? `${name}.md` }]));

describe('computeDrift (WORK-387)', () => {
	it('passes when every documentable rune has a type: rune page', () => {
		const drift = computeDrift(
			pkg(['hint', 'card']),
			pages([
				['hint', true],
				['card', true],
			]),
			new Set(),
		);
		expect(drift).toEqual({ missing: [], orphans: [], mislabelled: [] });
	});

	it('flags a documentable rune with no doc page', () => {
		const drift = computeDrift(pkg(['hint', 'newrune']), pages([['hint', true]]), new Set());
		expect(drift.missing).toEqual(['newrune']);
	});

	it('ignores aliases and PAGELESS runes', () => {
		const drift = computeDrift(
			pkg(['hint', 'faq', 'accordion-item'], ['faq']),
			pages([['hint', true]]),
			new Set(['accordion-item']),
		);
		expect(drift.missing).toEqual([]);
	});

	it('flags an orphan page that declares type: rune with no backing rune', () => {
		const drift = computeDrift(
			pkg(['hint']),
			pages([
				['hint', true],
				['removed', true, 'removed.md'],
			]),
			new Set(),
		);
		expect(drift.orphans).toEqual(['removed.md']);
	});

	it('does not flag a concept page (no type: rune) as an orphan', () => {
		const drift = computeDrift(
			pkg(['hint']),
			pages([
				['hint', true],
				['surfaces', false],
			]),
			new Set(),
		);
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
		const { missing, orphans, mislabelled } = computeDrift(
			loadPackageRunes(),
			findDocPages(),
			PAGELESS,
		);
		expect({ missing, orphans, mislabelled }).toEqual({
			missing: [],
			orphans: [],
			mislabelled: [],
		});
	});

	it('no PAGELESS rune actually has a doc page (keeps the known-gaps set honest)', () => {
		const docPages = findDocPages();
		const stale = [...PAGELESS].filter((name) => docPages.get(name)?.isRune);
		expect(stale).toEqual([]);
	});

	// WORK-548 — the content half of "do the pages and the runes agree?".
	it('every rune with generated attribute rows has a page that renders them', () => {
		const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
		expect(attributeCoverage(artifact)).toEqual([]);
	});

	it('no page hand-writes an attribute table beside the generated one', () => {
		// The drift this whole item exists to remove, and it comes back the
		// moment someone adds a row "just for now".
		const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
		expect(handWrittenTables(artifact)).toEqual([]);
	});

	it('the stale-artifact failure names the command to run', () => {
		expect(REGENERATE_COMMAND).toBe('npm run runes:attributes');
	});
});

describe('introCoverage (SPEC-187 D6)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'rune-intro-guard-'));
	const pages = new Map();
	const page = (name, body) => {
		writeFileSync(join(dir, `${name}.md`), `---\ntitle: ${name}\ntype: rune\n---\n\n${body}`);
		pages.set(name, { rel: `${name}.md`, isRune: true });
	};
	const intro = (name) =>
		`{% include file="rune-intro.md" variables={r: "rune:${name}"} /%}\n\nText.\n`;
	page('good', `${intro('good')}\n\`\`\`markdoc\n# A heading in an example\n\`\`\`\n`);
	page('missing', '# Missing\n\nText.\n');
	page('wrong', intro('other'));
	page('late', `Some text.\n\n${intro('late')}`);
	page(
		'hinted',
		`${intro('hinted')}\n{% hint type="note" %}\nThis rune is part of **@x/y**.\n{% /hint %}\n`,
	);
	page('titled', `${intro('titled')}\n# Titled\n`);
	pages.set('tab', { rel: 'tab.md', isRune: true }); // pageless: never read
	const by = (name) =>
		introCoverage(dir, pages)
			.filter((f) => f.page === `${name}.md`)
			.map((f) => f.problem);

	it('passes a page that opens with its intro, a heading inside a fence included', () => {
		expect(by('good')).toEqual([]);
	});
	it('fails a page with no intro, or with another rune’s', () => {
		expect(by('missing')).toEqual(['no rune intro', 'a hand-written # title']);
		expect(by('wrong')).toEqual(['no rune intro']);
	});
	it('fails an intro that is not first', () => {
		expect(by('late')).toEqual(['the intro is not the first thing on the page']);
	});
	it('fails the old install hint and a hand-written title', () => {
		expect(by('hinted')).toEqual(['the install hint']);
		expect(by('titled')).toEqual(['a hand-written # title']);
	});
	it('passes every rune page in this repository', () => {
		expect(introCoverage()).toEqual([]);
	});
});

describe('attributeSections (SPEC-193 D1)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'rune-attr-guard-'));
	const pages = new Map();
	const page = (name, body) => {
		writeFileSync(join(dir, `${name}.md`), `---\ntitle: ${name}\ntype: rune\n---\n\n${body}`);
		pages.set(name, { rel: `${name}.md`, isRune: true });
	};
	const inc = (r) => `{% include file="rune-attributes.md" variables={r: "rune:${r}"} /%}`;
	page(
		'good',
		`## Basic usage\n\nText.\n\n## Attributes\n\n${inc('good')}\n\n## See also\n\n- x\n`,
	);
	page('none', '## Basic usage\n\nText.\n');
	page('two', `## Attributes\n\n${inc('two')}\n\n${inc('two-item')}\n`);
	page('other', `## Attributes\n\n${inc('someone')}\n`);
	page('nested', `## Usage\n\n### Attributes\n\n${inc('nested')}\n`);
	page('early', `## Attributes\n\n${inc('early')}\n\n## More usage\n\nText.\n`);
	const by = (name) =>
		attributeSections(dir, pages)
			.filter((f) => f.page === `${name}.md`)
			.map((f) => f.problem);

	it('passes one include of the page’s own rune, under ## Attributes, before See also', () => {
		expect(by('good')).toEqual([]);
	});
	it('fails a missing include, or more than one', () => {
		expect(by('none')).toEqual(['no attribute table']);
		expect(by('two')).toEqual(['2 attribute includes']);
	});
	it('fails an include of another rune, one not under ## Attributes, and a section after it', () => {
		expect(by('other')).toEqual(['the attribute include names `someone`']);
		expect(by('nested')).toEqual(['the attribute include is not under `## Attributes`']);
		expect(by('early')).toEqual(['`## More usage` follows the attribute table']);
	});
	it('passes every rune page in this repository', () => {
		expect(attributeSections()).toEqual([]);
	});
});
