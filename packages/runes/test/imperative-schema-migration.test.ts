import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * SPEC-130's closing condition, checked mechanically — WORK-571.
 *
 * "The imperative form either still works or is fully migrated — not half of
 * each, per rune." That is the kind of claim that rots: every future rune author
 * copies the nearest example, and one surviving `schemaOrgType:` is all it takes
 * for the imperative form to be the nearest example again.
 *
 * So the catalog is read as text and the three imperative spellings are counted.
 * `PENDING` names the runes that have not migrated yet, with the item that owns
 * each — a list that only ever shrinks, and whose emptiness is the milestone
 * being done. The test fails both ways: a rune that migrates without leaving
 * this list fails just as loudly as a rune that reintroduces the old form,
 * because a stale allow-list is how a guard stops guarding.
 */

const ROOT = join(import.meta.dirname, '../../..');

/**
 * Files that still build their schema by hand, and the work item that ends it.
 *
 * **Empty since WORK-570.** That emptiness is SPEC-130's closing condition: no
 * rune anywhere passes `schemaOrgType` or a `schema:` map to
 * `createComponentRenderable`, and no transform mutates `attributes.typeof`. The
 * list stays here rather than being deleted with the last entry, because a
 * migration that ends with nothing to point at is exactly the one that quietly
 * reacquires an exception.
 */
const PENDING: Record<string, string> = {};

/** Every rune source file in the catalog: core tags plus every plugin's tags. */
function runeSources(): string[] {
	const out: string[] = [];
	const collect = (dir: string) => {
		let entries: string[];
		try {
			entries = readdirSync(join(ROOT, dir));
		} catch {
			return;
		}
		for (const name of entries) {
			if (name.endsWith('.ts') && !name.endsWith('.d.ts')) out.push(`${dir}/${name}`);
		}
	};
	collect('packages/runes/src/tags');
	for (const plugin of readdirSync(join(ROOT, 'plugins'))) {
		collect(`plugins/${plugin}/src/tags`);
	}
	return out.sort();
}

/**
 * The three imperative spellings.
 *
 * `schema:` is matched only as an argument to `createComponentRenderable` —
 * `createContentModelSchema({ schema: … })` is the *declarative* form and is
 * exactly what this migration produces, so a bare `schema:` would match both.
 * The distinguishing feature is indentation: the call's arguments sit deeper
 * than a schema declaration's top-level key.
 */
function imperativeHits(source: string): string[] {
	const hits: string[] = [];
	if (/\bschemaOrgType\s*:/.test(source)) hits.push('schemaOrgType:');
	if (/\battributes\.typeof\s*=/.test(source)) hits.push('attributes.typeof =');
	for (const call of source.matchAll(/createComponentRenderable\(\{[\s\S]*?\n(\t*)\}\)/g)) {
		const [body, indent] = [call[0], call[1]];
		if (new RegExp(`\\n${indent}\\t(schema|typeof)\\s*:`).test(body)) {
			hits.push('a schema map passed to createComponentRenderable');
		}
	}
	return [...new Set(hits)];
}

describe('the imperative schema.org form is migrated, not half-migrated', () => {
	const sources = runeSources();

	it('reads the whole catalog', () => {
		// A broken path would make every assertion below vacuous.
		expect(sources.length).toBeGreaterThan(90);
		expect(sources).toContain('packages/runes/src/tags/breadcrumb.ts');
		expect(sources).toContain('plugins/business/src/tags/timeline.ts');
	});

	it('finds the imperative form only where an open work item still owns it', () => {
		const found: Record<string, string[]> = {};
		for (const file of sources) {
			const hits = imperativeHits(readFileSync(join(ROOT, file), 'utf8'));
			if (hits.length > 0) found[file] = hits;
		}

		const unexpected = Object.keys(found).filter((f) => !PENDING[f]);
		expect(
			unexpected,
			'these build their schema.org data by hand; declare a `schema:` table instead',
		).toEqual([]);

		const stale = Object.keys(PENDING).filter((f) => !found[f]);
		expect(
			stale,
			'these have migrated — drop them from PENDING so the guard keeps guarding',
		).toEqual([]);
	});

	it('detects the form it is looking for', () => {
		// The assertion above passes trivially if the matcher never matches, which
		// is the failure mode a migration guard is most likely to end up in.
		expect(imperativeHits('schemaOrgType: "Thing",')).toEqual(['schemaOrgType:']);
		expect(imperativeHits('(node as any).attributes.typeof = t;')).toEqual(['attributes.typeof =']);
		expect(
			imperativeHits(
				['createComponentRenderable({', '\trune: "probe",', '\tschema: { name: t },', '})'].join(
					'\n',
				),
			),
		).toEqual(['a schema map passed to createComponentRenderable']);
	});

	it('does not mistake a declared table for the imperative form', () => {
		// `createContentModelSchema({ schema: table })` is the migration's output.
		expect(
			imperativeHits(
				[
					'export const probe = createContentModelSchema({',
					'\tschema: probeSchema,',
					'\ttransform() {',
					'\t\treturn createComponentRenderable({ rune: "probe" });',
					'\t},',
					'});',
				].join('\n'),
			),
		).toEqual([]);
	});
});
