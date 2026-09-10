import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';

// SPEC-125 Phase 3 / WORK-534 — the language server was the loudest symptom of
// the old behaviour: every rune advertised all ~37 universal attributes, so
// completion offered `frame-oversize` on a `{% grid %}` and `reading` on runes
// with no prose to set. Narrowing happens in the Markdoc schema, which is what
// the registry indexes, so completion narrows for free.
//
// "For free" is the load-bearing claim, and it has two halves:
//
//  1. Completion is narrowed. Asserted below against real runes.
//  2. Nothing was added to the completion path to achieve it — in particular no
//     theme config is read. A language server answers completion on every
//     keystroke; resolving a site config there would be a latency regression,
//     and the applicability question is answerable without one because
//     applicability is rune identity (ADR-028), not theme configuration.
//
// The second half is asserted by making the config loader throw. `loader.ts`
// imports it for `initializeRegistry`, which this test never calls; if
// completion ever started resolving a config, every case here would fail.

vi.mock('@refrakt-md/transform/node', () => ({
  loadRefraktConfig: () => {
    throw new Error('completion must not load theme config (SPEC-125 / WORK-534)');
  },
  resolveSite: () => {
    throw new Error('completion must not resolve a site (SPEC-125 / WORK-534)');
  },
}));

const { provideCompletion } = await import('../src/providers/completion.js');
const { TextDocument } = await import('vscode-languageserver-textdocument');
type Documents = Parameters<typeof provideCompletion>[1];

/** Complete at the end of `content`, with the registry in its as-imported state
 *  — core runes only, indexed synchronously, no workspace initialization. */
function labels(content: string): string[] {
  const doc = TextDocument.create('file:///test.md', 'markdown', 1, content);
  const documents = {
    get: (uri: string) => (uri === 'file:///test.md' ? doc : undefined),
  } as unknown as Documents;
  return provideCompletion(
    { textDocument: { uri: 'file:///test.md' }, position: doc.positionAt(content.length) },
    documents,
  ).map((item) => item.label);
}

describe('completion offers only the universal attributes that apply', () => {
	it('drops prose axes from a rune with no body role', () => {
		// `grid` arranges children; it has no prose of its own, so `reading` and
		// `dropcap` were always inert on it.
		const grid = labels('{% grid ');
		expect(grid).not.toContain('reading');
		expect(grid).not.toContain('dropcap');
		// …and it has no header or media surface either.
		expect(grid).not.toContain('prominence');
		expect(grid).not.toContain('frame');
		expect(grid).not.toContain('frame-aspect');
		// …but `scrim*` stays: it belongs to the `bg` axis, which every rune has.
		// The background layer builds a scrim on any rune; cover mode only
		// reroutes it to the media well (WORK-536).
		expect(grid).toContain('scrim');
	});

	it('keeps the axes that a rune can actually act on', () => {
		// The converse: over-narrowing would be the worse failure, because the
		// author would be told an attribute does not exist when the engine honours
		// it. `blog` has a body role and a header role; `card` adds a media slot.
		const blog = labels('{% blog ');
		expect(blog).toEqual(expect.arrayContaining(['reading', 'dropcap', 'prominence']));

		const card = labels('{% card ');
		expect(card).toEqual(expect.arrayContaining(['frame', 'frame-aspect', 'reading']));

		// Axes that gate on nothing structural stay everywhere they always were.
		for (const list of [blog, card, labels('{% grid ')]) {
			expect(list).toEqual(expect.arrayContaining(['tint', 'width', 'spacing', 'reveal']));
		}
	});

	it('offers nothing universal on a rune whose posture rules them out', () => {
		// `badge` renders an inline span. Its schema is hand-written, so it never
		// carried universal attributes — what Phase 3 changed is that this is now
		// *recorded* as `inline` posture rather than being an accident of which
		// constructor it used. The rule itself is exercised in
		// `packages/runes/test/universal-attributes.test.ts`; what this case pins
		// is that completion says the same thing, and still offers the rune's own.
		const badge = labels('{% badge ');
		expect(badge).not.toContain('tint');
		expect(badge).not.toContain('width');
		expect(badge.length).toBeGreaterThan(0);
	});

	it('narrows value completion the same way, not just names', () => {
		// Attribute *values* resolve through the same schema. An author who types
		// the attribute anyway gets no phantom enum to pick from.
		expect(labels('{% grid reading="')).toEqual([]);
		expect(labels('{% blog reading="').length).toBeGreaterThan(0);
	});

	it('still completes tag names and non-universal attributes', () => {
		// A blunt guard against narrowing having broken completion outright.
		expect(labels('{% gri')).toContain('grid');
		expect(labels('{% grid ')).toContain('columns');
	});
});
