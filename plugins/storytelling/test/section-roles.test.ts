import { describe, it, expect } from 'vitest';
import { createTransform } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { parse, findTag } from './helpers.js';
import { config as storytellingConfig } from '../src/config.js';

// SPEC-125 Phase 1 / WORK-530 — the storytelling audit is the same pattern
// three times over, so it is tested that way: one table for the entity runes
// and one for their `*Section` children, each asserting the same thing about
// all three. A sibling that diverges fails its row.

const themeConfig: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: storytellingConfig,
};

function transformed(content: string, rune: string): SerializedTag {
	const found = findTag(parse(content) as any, (t) => t.attributes['data-rune'] === rune);
	expect(found, `no ${rune} in schema output`).toBeDefined();
	const serialized = JSON.parse(JSON.stringify(found)) as SerializedTag;
	return createTransform(themeConfig)(serialized) as SerializedTag;
}

function findByAttr(node: any, attr: string, value: string): any {
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.[attr] === value) return node;
	for (const c of node.children ?? []) {
		const hit = findByAttr(c, attr, value);
		if (hit) return hit;
	}
	return undefined;
}

/** The entity's own body slot, not a child section's — search the entity's
 *  children but stop at a nested `*-section` rune. */
function ownBody(node: any): any {
	for (const c of node.children ?? []) {
		if (!c || typeof c !== 'object') continue;
		if (typeof c.attributes?.['data-rune'] === 'string' && c.attributes['data-rune'].endsWith('-section')) continue;
		if (c.attributes?.['data-name'] === 'body') return c;
		const hit = ownBody(c);
		if (hit) return hit;
	}
	return undefined;
}

// All three emit *either* an entity `body` slot or a `sections` container, never
// both, so the body assertions use a source with no `##` headings and the child
// assertions use one with them.
const ENTITIES = [
	{
		rune: 'character',
		open: (attrs: string) => `{% character name="Veshra" ${attrs} %}`,
		close: '{% /character %}',
		section: '## Backstory\n\nRaised in shadow.',
	},
	{
		rune: 'realm',
		open: (attrs: string) => `{% realm name="Rivendell" ${attrs} %}`,
		close: '{% /realm %}',
		section: '## Geography\n\nA hidden valley.',
	},
	{
		rune: 'faction',
		open: (attrs: string) => `{% faction name="The Silver Order" ${attrs} %}`,
		close: '{% /faction %}',
		section: '## Ranks\n\nKnight, squire.',
	},
];

const plain = (e: (typeof ENTITIES)[number], attrs = '') => `${e.open(attrs)}\nEntity prose.\n${e.close}`;
const sectioned = (e: (typeof ENTITIES)[number], attrs = '') => `${e.open(attrs)}\n${e.section}\n${e.close}`;

describe.each(ENTITIES)('$rune — entity body role', (entity) => {
	const { rune } = entity;

	it('emits data-section="body" on its own body slot', () => {
		const body = ownBody(transformed(plain(entity), rune));
		expect(body?.attributes['data-section']).toBe('body');
	});

	it('reading and dropcap land on the body', () => {
		const body = ownBody(transformed(plain(entity, 'reading="prose" dropcap=true'), rune));
		expect(body?.attributes['data-reading']).toBe('prose');
		expect(body?.attributes['data-dropcap']).toBe('true');
	});

	it('keeps the header roles it already had', () => {
		// `name` inside a `preamble` header was always right, so `prominence`
		// already worked on these three — only `body` was missing.
		const out = transformed(plain(entity), rune);
		expect(findByAttr(out, 'data-name', 'preamble')?.attributes['data-section']).toBe('preamble');
		expect(findByAttr(out, 'data-name', 'name')?.attributes['data-section']).toBe('title');
	});
});

describe.each(ENTITIES)('$rune — child section roles', (entity) => {
	const { rune } = entity;
	const child = `${rune}-section`;

	it('the child section emits data-section="body" on its prose', () => {
		const section = findByAttr(transformed(sectioned(entity), rune), 'data-rune', child);
		expect(section, `no ${child} in output`).toBeDefined();
		expect(findByAttr(section, 'data-name', 'body')?.attributes['data-section']).toBe('body');
	});

	it('the child section declares no header-ish role on its name', () => {
		// Deliberate. The entity's own `name` already holds `title`; a second
		// title in the same subtree would flatten the hierarchy `prominence`
		// exists to scale, and the skin pins the section name's type outright,
		// so the role would be inert anyway.
		const section = findByAttr(transformed(sectioned(entity), rune), 'data-rune', child);
		const name = findByAttr(section, 'data-name', 'name');
		expect(name).toBeDefined();
		expect(name?.attributes['data-section']).toBeUndefined();
	});
});
