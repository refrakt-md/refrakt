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
	it('ships the phase 1 and phase 2 ids', () => {
		expect([...DEFAULT_VALIDATION_IDS]).toEqual([
			'tag-undefined',
			'attribute-undefined',
			'attribute-value-invalid',
			'attribute-missing-required',
			'attribute-type-invalid',
		]);
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
		// An id Markdoc can emit that we deliberately do not report.
		const ids = resolveValidationIds();
		expect(ids.has('variable-undefined')).toBe(false);
		expect(ids.has('no-inline-annotations')).toBe(false);
	});
});

describe('phase 2 — the attribute ids make the schemas mean something', () => {
	it('reports an out-of-enum `matches` value', async () => {
		// BUG-014's symptom 1, third row: `transform()` passes the bad value
		// straight through, the engine emits `.rf-hint--danger` and
		// `[data-type="danger"]`, and no CSS matches — a silently unstyled
		// variant. Lumina's css-coverage test cannot catch it, because it
		// derives expected selectors from `baseConfig`: it checks config→CSS,
		// never content→CSS.
		page('index.md', '---\ntitle: T\n---\n\n{% hint type="danger" %}x{% /hint %}\n');
		const found = await findings();
		expect(found.map((f) => f.message).join('\n')).toContain('attribute-value-invalid');
		expect(found.map((f) => f.message).join('\n')).toContain('danger');
	});

	it('reports a missing required attribute', async () => {
		// `accordion-item` declares `name` required.
		page(
			'index.md',
			'---\ntitle: T\n---\n\n{% accordion %}\n{% accordion-item %}\nbody\n{% /accordion-item %}\n{% /accordion %}\n',
		);
		const found = await findings();
		expect(found.map((f) => f.message).join('\n')).toContain('attribute-missing-required');
	});

	it('reports a type mismatch', async () => {
		// `collection.limit` is a count. Quoting it is the slip this catches —
		// and the one that was in our own docs until WORK-558.
		page('index.md', '---\ntitle: T\n---\n\n{% collection type="page" limit="5" /%}\n');
		const found = await findings();
		expect(found.map((f) => f.message).join('\n')).toContain('attribute-type-invalid');
		expect(found.map((f) => f.message).join('\n')).toContain('limit');
	});

	it('accepts the correct forms without complaint', async () => {
		page(
			'index.md',
			'---\ntitle: T\n---\n\n{% hint type="note" %}x{% /hint %}\n\n{% collection type="page" limit=5 /%}\n',
		);
		expect(await findings()).toEqual([]);
	});
});

describe('the dormant custom attribute validators now execute in a build', () => {
	// The heart of BUG-014's symptom 2. `transform()` does not invoke a
	// `CustomAttributeTypeInterface`'s `validate()` — only `Markdoc.validate()`
	// does — so every one of these classes was dead code in the build path.
	// These tests run them through `loadContent`, the real pipeline, not
	// through the class directly.

	it('`SpaceSeparatedNumberList` rejects non-numeric input in a build', async () => {
		// No shipped rune currently uses this type (only `SpaceSeparatedList`,
		// on `grid.spans`), so the type is registered on a test rune here. What
		// is being proved is that the *pipeline* invokes a custom validator at
		// all — which it never did before SPEC-132 — not that any particular
		// rune declares this one.
		const { SpaceSeparatedNumberList } = await import('@refrakt-md/runes');
		const probe = {
			render: 'Probe',
			attributes: { cols: { type: SpaceSeparatedNumberList, required: false } },
		};
		page('index.md', '---\ntitle: T\n---\n\n{% probe cols="1 two 3" /%}\n');
		const site = await loadContent(
			dir,
			'/',
			undefined,
			{ probe } as never,
			undefined,
			undefined,
			undefined,
			undefined,
			dir,
			undefined,
			undefined,
			{},
		);
		const found = site.pipelineWarnings.filter((w) => w.phase === 'validate');
		const text = found.map((f) => f.message).join('\n');
		expect(text).toContain('contains non-numeric value');
		expect(text).toContain('two');
	});

	it('emits `error`, not `critical`, matching Markdoc (SPEC-132 D11)', async () => {
		// All four custom validators returned `level: 'critical'` for an id
		// Markdoc emits at `error`, so the identical failure was reported at two
		// severities depending on which code path produced it. Harmless while
		// nothing read severity; wrong the moment this milestone made it
		// load-bearing — `critical` is the non-suppressible band, and an
		// out-of-range attribute is not "the document could not be understood".
		//
		// `PipelineWarning` flattens both onto `severity: 'error'`, so the
		// assertion that bites is the suppressibility one: a config disabling
		// the id must now reach this finding, which it could not have done while
		// the validator claimed `critical` — `critical` bypasses configuration
		// entirely.
		const { SpaceSeparatedNumberList } = await import('@refrakt-md/runes');
		const probe = {
			render: 'Probe',
			attributes: { cols: { type: SpaceSeparatedNumberList, required: false } },
		};
		page('index.md', '---\ntitle: T\n---\n\n{% probe cols="1 two 3" /%}\n');
		const site = await loadContent(
			dir,
			'/',
			undefined,
			{ probe } as never,
			undefined,
			undefined,
			undefined,
			undefined,
			dir,
			undefined,
			undefined,
			{ validation: { enabled: true, disableIds: ['attribute-type-invalid'] } },
		);
		const found = site.pipelineWarnings.filter((w) => w.phase === 'validate');
		expect(found).toHaveLength(1);
		expect(found[0].severity).toBe('info');
	});

	it('`SpaceSeparatedList` runs for `grid.spans`, a shipped rune', async () => {
		// The one custom-typed attribute that actually ships. A well-formed
		// value passes; the validator running at all is the point.
		page('index.md', '---\ntitle: T\n---\n\n{% grid spans="2 1 1" %}\na\n{% /grid %}\n');
		expect(await findings()).toEqual([]);
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

describe('the escape hatch is narrow, and critical is outside it (SPEC-132 D5 / D11)', () => {
	it('a site-scoped switch stops reporting', async () => {
		page('index.md', '---\ntitle: T\n---\n\n{% hint type="note" bogus="1" %}x{% /hint %}\n');
		expect(await findings({ validation: { enabled: false } })).toEqual([]);
		// …and the same page reports without it, so the test is not vacuous.
		expect(await findings()).not.toEqual([]);
	});

	it('an individual id can be turned off, leaving the rest reporting', async () => {
		page('index.md', '---\ntitle: T\n---\n\n{% hint type="danger" bogus="1" %}x{% /hint %}\n');
		const found = await findings({
			validation: { enabled: true, disableIds: ['attribute-undefined'] },
		});
		const problems = found.filter((f) => f.severity !== 'info');
		expect(problems.map((f) => f.message).join('\n')).toContain('attribute-value-invalid');
		expect(problems.map((f) => f.message).join('\n')).not.toContain('attribute-undefined');
	});

	it('a disabled id is demoted to `info`, not dropped', async () => {
		// WORK-559's recorded decision. Someone who judged an id unimportant
		// should stop seeing it in the build summary, but it should not become
		// invisible — turning it back on later ought to be an informed choice.
		page('index.md', '---\ntitle: T\n---\n\n{% hint type="note" bogus="1" %}x{% /hint %}\n');
		const found = await findings({
			validation: { enabled: true, disableIds: ['attribute-undefined'] },
		});
		expect(found).toHaveLength(1);
		expect(found[0].severity).toBe('info');
		expect(found[0].message).toContain('attribute-undefined');
	});

	it('an id that was never enabled is dropped, not demoted', async () => {
		// The distinction that keeps demotion from becoming an `info` stream of
		// every check the project has decided against. `variable-undefined` is
		// not in the allow-list and must produce nothing at all.
		page(
			'index.md',
			'---\ntitle: T\n---\n\n{% collection type="page" %}\n{% $item.data.nope %}\n{% /collection %}\n',
		);
		const found = await findings();
		expect(found.map((f) => f.message).join('\n')).not.toContain('variable-undefined');
	});

	it('`critical` findings survive a fully disabled config', async () => {
		// The load-bearing assertion for D11. `{% code %}` declares
		// `inline: true`; forcing it block-level is `tag-placement-invalid`,
		// which Markdoc emits at `critical`. No configuration may silence it:
		// critical means the document could not be *understood*, which is not a
		// matter of preference.
		page('index.md', '---\ntitle: T\n---\n\n{% hnit %}x{% /hnit %}\n');
		const found = await findings({
			validation: { enabled: false, disableIds: ['tag-undefined'] },
		});
		expect(found).toHaveLength(1);
		expect(found[0].severity).toBe('error');
		expect(found[0].message).toContain('tag-undefined');
	});

	it('offers no per-page or per-tag suppression', () => {
		// D5: that granularity invites silencing the one call site that revealed
		// a real bug. Pinned on the settings shape itself, because the cheapest
		// way for it to appear is someone adding a field.
		const settings: Record<string, unknown> = { enabled: true, ids: [], disableIds: [] };
		expect(Object.keys(settings).sort()).toEqual(['disableIds', 'enabled', 'ids']);
	});
});
