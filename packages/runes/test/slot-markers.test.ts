import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import {
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	nodes,
	tags,
	OWNER_ATTR,
	SLOT_ATTR,
	tableFor,
} from '../src/index.js';
import { schemaPreprocessors } from '../src/lib/preprocess.js';

// SPEC-145 D10a step 2 — the markers are declared once, where the Markdoc
// config is assembled. The survival test over every placeable rune lives in
// `packages/content/test/slot-marker-survival.test.ts`, beside the assembly.

describe('declareSlotMarkers', () => {
	it('declares both markers on every schema it is given', () => {
		const out = declareSlotMarkers(tags as Record<string, Schema>);
		for (const [name, schema] of Object.entries(out)) {
			expect(schema.attributes?.[OWNER_ATTR], name).toEqual({ type: String });
			expect(schema.attributes?.[SLOT_ATTR], name).toEqual({ type: String });
		}
	});

	it('copies rather than mutating the shared maps', () => {
		const out = declareSlotMarkers(tags as Record<string, Schema>);
		expect(out).not.toBe(tags);
		expect((tags as Record<string, Schema>).hint.attributes?.[OWNER_ATTR]).toBeUndefined();
		// A copy keeps everything else, including the transform.
		expect(out.hint.transform).toBe((tags as Record<string, Schema>).hint.transform);
	});

	it('builds one copy per map', () => {
		const map = tags as Record<string, Schema>;
		expect(declareSlotMarkers(map)).toBe(declareSlotMarkers(map));
	});

	it('covers the nodes Markdoc would otherwise fall back to, without touching Markdoc', () => {
		const out = declareSlotMarkersOnNodes(nodes as Record<string, Schema>);
		expect(out.blockquote.attributes?.[SLOT_ATTR]).toBeDefined();
		expect(out.paragraph.attributes?.[SLOT_ATTR]).toBeDefined();
		expect(Markdoc.nodes.blockquote.attributes?.[SLOT_ATTR]).toBeUndefined();
	});

	it('is inert while nothing sets a marker', () => {
		const source = '{% hint %}\nSome **text**.\n\n> quoted\n{% /hint %}\n';
		const render = (config: object) =>
			JSON.stringify(Markdoc.transform(Markdoc.parse(source), config as never));
		const assembled = {
			tags: declareSlotMarkers(tags as Record<string, Schema>),
			nodes: declareSlotMarkersOnNodes(nodes as Record<string, Schema>),
		};
		expect(render(assembled)).toBe(render({ tags, nodes }));
	});
});

describe('a marker-declaring copy is still the rune it was copied from', () => {
	// The side tables are keyed by schema identity, and assembly copies every
	// schema. Without the origin fallback an `{% include %}` stopped being
	// preprocessed and every schema table stopped applying.
	const assembled = declareSlotMarkers(tags as Record<string, Schema>);
	const original = tags as Record<string, Schema>;

	it('answers the side tables for the copy', () => {
		expect(schemaPreprocessors.get(assembled.include)).toBe(
			schemaPreprocessors.get(original.include),
		);
		expect(schemaPreprocessors.get(assembled.include)).toBeDefined();
		expect(tableFor({ schema: assembled.figure })).toBe(tableFor({ schema: original.figure }));
		expect(tableFor({ schema: assembled.figure })).toBeDefined();
	});

	it('keys every schema side table through SchemaSideTable', () => {
		// A plain `WeakMap<Schema, …>` would answer nothing for an assembled copy,
		// silently. This keeps the next side table from being one.
		const src = fileURLToPath(new URL('../src', import.meta.url));
		const files: string[] = [];
		const walk = (dir: string) => {
			for (const name of readdirSync(dir)) {
				const path = join(dir, name);
				if (statSync(path).isDirectory()) walk(path);
				// The class's own origin map is the one plain map allowed.
				else if (path.endsWith('.ts') && name !== 'schema-side-table.ts') files.push(path);
			}
		};
		walk(src);
		const raw = files.filter((f) => /new WeakMap<Schema\b/.test(readFileSync(f, 'latin1')));
		expect(raw).toEqual([]);
	});
});
