import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadContent } from '../src/site.js';
import { DEFAULT_VALIDATION_IDS, resolveValidationIds, isSuppressible } from '../src/validate.js';
import type { PipelineWarning } from '@refrakt-md/types';

/**
 * Content validation in the build pipeline (SPEC-132 / WORK-556).
 *
 * BUG-014's core claim was that `Markdoc.validate()` never sees a user's pages,
 * so a mistyped rune drops its tag and renders its children as prose with
 * nothing anywhere reporting it. These tests pin the wiring that closes it.
 */

let dir: string;

beforeEach(() => {
	dir = mkdtempSync(path.join(tmpdir(), 'rf-validate-'));
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

function page(name: string, body: string) {
	const file = path.join(dir, name);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, body);
}

async function findings(siteConfig?: unknown): Promise<PipelineWarning[]> {
	const site = await loadContent(
		dir,
		'/',
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		dir,
		undefined,
		undefined,
		siteConfig ?? {},
	);
	return site.pipelineWarnings.filter((w) => w.phase === 'validate');
}

describe('content validation reports what the schemas already declared', () => {
	it("reports a typo'd rune name — the failure that used to vanish silently", async () => {
		// BUG-014's sharpest case: `transform()` drops the tag and renders the
		// children as prose, so the block disappears from the page with no
		// diagnostic anywhere.
		page('index.md', '---\ntitle: T\n---\n\n{% hnit type="warning" %}gone{% /hnit %}\n');
		const found = await findings();
		expect(found).toHaveLength(1);
		expect(found[0].message).toContain('tag-undefined');
		expect(found[0].message).toContain('hnit');
	});

	it('reports an unknown attribute', async () => {
		page('index.md', '---\ntitle: T\n---\n\n{% hint type="note" bogus="1" %}x{% /hint %}\n');
		const found = await findings();
		expect(found.map((f) => f.message).join('\n')).toContain('attribute-undefined');
		expect(found.map((f) => f.message).join('\n')).toContain('bogus');
	});

	it('reports nothing for a clean page', async () => {
		page('index.md', '---\ntitle: T\n---\n\n{% hint type="note" %}fine{% /hint %}\n');
		expect(await findings()).toEqual([]);
	});

	it('carries the page URL and attributes core findings to `core`', async () => {
		page('guide/index.md', '---\ntitle: T\n---\n\n{% nope %}x{% /nope %}\n');
		const [f] = await findings();
		expect(f.url).toBe('/guide');
		expect(f.pluginName).toBe('core');
		expect(f.phase).toBe('validate');
	});

	it('renders nothing into the page — findings are diagnostics only (D9)', async () => {
		// The rune vanishes exactly as it did before; validation annotates, it
		// does not repair or replace. An earlier draft of SPEC-132 routed
		// findings into the `error` rune and a later one into snippet's error
		// fence; both were withdrawn, and this test is what keeps them out.
		page('index.md', '---\ntitle: T\n---\n\n{% hnit %}body text{% /hnit %}\n');
		const site = await loadContent(
			dir,
			'/',
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			dir,
			undefined,
			undefined,
			{},
		);
		const blob = JSON.stringify(site.pages[0].renderable);
		expect(blob).toContain('body text');
		expect(blob).not.toContain('tag-undefined');
		expect(blob).not.toContain('data-snippet-error');
	});
});

describe('the id allow-list is explicit, so enabling an id is deliberate', () => {
	it('ships only the phase 1 ids', () => {
		expect([...DEFAULT_VALIDATION_IDS]).toEqual(['tag-undefined', 'attribute-undefined']);
	});

	it('never enables `variable-undefined` (SPEC-132 D4)', async () => {
		// Markdoc validates the *full path* and has no scope model, so a
		// collection template using `$item.data.*` would light up entirely.
		// This is the pin: the ids list must not grow this member.
		expect(resolveValidationIds().has('variable-undefined')).toBe(false);

		page(
			'index.md',
			'---\ntitle: T\n---\n\n{% collection type="page" %}\n### {% $item.data.title %}\n{% $item.data.description %}\n{% /collection %}\n',
		);
		const found = await findings();
		expect(found.map((f) => f.message).join('\n')).not.toContain('variable-undefined');
	});

	it('filters ids outside the allow-list', async () => {
		// `attribute-value-invalid` is phase 2 (WORK-558), not phase 1.
		const ids = resolveValidationIds();
		expect(ids.has('attribute-value-invalid')).toBe(false);
		expect(ids.has('attribute-missing-required')).toBe(false);
		expect(ids.has('attribute-type-invalid')).toBe(false);
	});
});

describe('severity mapping', () => {
	it('treats `critical` as non-suppressible and everything else as configurable (D11)', () => {
		expect(isSuppressible('critical')).toBe(false);
		expect(isSuppressible('error')).toBe(true);
		expect(isSuppressible('warning')).toBe(true);
		expect(isSuppressible('info')).toBe(true);
	});

	it('maps a `critical` finding onto `error` severity', async () => {
		// Worth stating plainly, because SPEC-132 D11 got this wrong: in the
		// pinned Markdoc (0.4.0) `tag-undefined` is emitted at `critical`, not
		// `error` — see `src/validator.ts`, where `!schema` pushes
		// `level: 'critical'`. The spec's claim that "all four of this spec's
		// phase 1 and 2 ids are `error`, never `critical`" is false for the
		// headline id. `PipelineWarning` has no `critical` severity, so both
		// land on `error`; the distinction that matters is suppressibility.
		page('index.md', '---\ntitle: T\n---\n\n{% hnit %}x{% /hnit %}\n');
		const [f] = await findings();
		expect(f.severity).toBe('error');
	});
});

describe('fenced examples stay exempt (SPEC-132 D7)', () => {
	it('does not report runes written inside a markdoc fence', async () => {
		// `escapeFenceTags` neutralises tags inside fences before parsing. This
		// test pins that ordering: validation must run *after* it, or every
		// documentation example of a deliberately-wrong rune becomes a finding
		// and the feature is abandoned within a day.
		page(
			'index.md',
			[
				'---',
				'title: T',
				'---',
				'',
				'Here is a rune that does not exist, shown as an example:',
				'',
				'```markdoc',
				'{% definitely-not-a-rune attr="x" %}',
				'content',
				'{% /definitely-not-a-rune %}',
				'```',
				'',
			].join('\n'),
		);
		expect(await findings()).toEqual([]);
	});

	it('still reports the same rune outside the fence', async () => {
		// The companion assertion — without it the test above passes for a
		// validator that reports nothing at all.
		page(
			'index.md',
			[
				'---',
				'title: T',
				'---',
				'',
				'```markdoc',
				'{% definitely-not-a-rune /%}',
				'```',
				'',
				'{% definitely-not-a-rune /%}',
				'',
			].join('\n'),
		);
		const found = await findings();
		expect(found).toHaveLength(1);
		expect(found[0].message).toContain('definitely-not-a-rune');
	});
});
