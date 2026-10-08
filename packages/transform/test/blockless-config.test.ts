import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTransform } from '../src/engine.js';
import { generateStructureContract } from '../src/contracts.js';
import { validateThemeConfig } from '../src/validate.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig, RuneConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

/** SPEC-145 D2a / WORK-620 — a `RuneConfig` may omit `block`. The engine then
 *  runs every step it runs for any rune except emitting BEM classes. */

const isT = (c: unknown): c is SerializedTag =>
	typeof c === 'object' && c !== null && '$$mdtype' in (c as object);

function theme(runes: ThemeConfig['runes']): ThemeConfig {
	return {
		prefix: 'rf',
		tokenPrefix: '--rf',
		icons: {},
		tints: { warm: { light: { background: '#fdf6e3' } } },
		runes,
	};
}

/** A fixture config exercising modifiers, universal attributes, metadata
 *  blocks, section anatomy and inline styles. Given once with a block and once
 *  without, so the two outputs can be compared. */
const anatomy: Omit<RuneConfig, 'block'> = {
	modifiers: {
		tone: { source: 'meta', default: 'neutral' },
		role: { source: 'meta' },
		accent: { source: 'meta' },
	},
	styles: { accent: '--member-accent' },
	sections: { body: 'body' },
	metaFields: { role: { metaType: 'category' } },
	blocks: { eyebrow: { fields: ['role'], layout: 'bar' } },
	layout: { root: ['eyebrow', 'body'] },
};
const withBlock: RuneConfig = { block: 'member', ...anatomy };
const blockless: RuneConfig = { ...anatomy };

function memberTag(extraAttrs: Record<string, string> = {}): SerializedTag {
	return makeTag(
		'article',
		{
			'data-rune': 'member',
			'data-rune-fields': JSON.stringify({ tone: 'bright', role: 'Archivist', accent: 'teal' }),
			width: 'wide',
			spacing: 'loose',
			...extraAttrs,
		},
		[
			makeTag('meta', { 'data-field': 'tint', content: 'warm' }),
			makeTag('div', { 'data-name': 'body' }, [makeTag('p', {}, ['Veshra'])]),
		],
	);
}

/** Every class token anywhere in the tree. */
function allClasses(node: SerializedTag): string[] {
	const own = (node.attributes.class ?? '').split(/\s+/).filter(Boolean);
	return [...own, ...node.children.filter(isT).flatMap(allClasses)];
}

/** The tree with every `rf-member*` class removed (and `class` dropped when
 *  that empties it) — what a block-less transform should produce. */
function stripBlockClasses(node: SerializedTag): SerializedTag {
	const { class: cls, ...rest } = node.attributes;
	const kept = (cls ?? '')
		.split(/\s+/)
		.filter((c) => c && !/^rf-member(__|--|$)/.test(c))
		.join(' ');
	return {
		...node,
		attributes: kept ? { ...rest, class: kept } : rest,
		children: node.children.map((c) => (isT(c) ? stripBlockClasses(c) : c)),
	};
}

describe('block-less RuneConfig (SPEC-145 D2a)', () => {
	afterEach(() => vi.restoreAllMocks());

	it('never emits `rf-undefined`', () => {
		const out = createTransform(theme({ Member: blockless }))(memberTag()) as SerializedTag;
		expect(JSON.stringify(out)).not.toContain('undefined');
		expect(allClasses(out).some((c) => c.startsWith('rf-member'))).toBe(false);
	});

	it('root carries no `rf-*` class and no `data-rune-fields`', () => {
		const out = createTransform(theme({ Member: blockless }))(memberTag()) as SerializedTag;
		const rootClasses = (out.attributes.class ?? '').split(/\s+/).filter(Boolean);
		expect(rootClasses.filter((c) => c.startsWith('rf-'))).toEqual([]);
		expect(out.attributes).not.toHaveProperty('data-rune-fields');
		expect(out.attributes['data-rune']).toBe('member');
	});

	it('keeps an author class on the root', () => {
		const out = createTransform(theme({ Member: blockless }))(
			memberTag({ class: 'pinned' }),
		) as SerializedTag;
		expect(out.attributes.class).toBe('pinned');
	});

	it('renders modifiers as `data-*` attributes', () => {
		const out = createTransform(theme({ Member: blockless }))(memberTag()) as SerializedTag;
		expect(out.attributes['data-tone']).toBe('bright');
		expect(out.attributes['data-role']).toBe('Archivist');
		expect(out.attributes.style).toContain('--member-accent: teal');
	});

	it('applies universal attributes as it would with a block', () => {
		const out = createTransform(theme({ Member: blockless }))(memberTag()) as SerializedTag;
		expect(out.attributes['data-tint']).toBe('warm');
		expect(out.attributes.style).toContain('--tint-background: #fdf6e3');
		expect(out.attributes['data-width']).toBe('wide');
		expect(out.attributes['data-spacing']).toBe('loose');
		expect(out.attributes).not.toHaveProperty('width');
		expect(out.attributes).not.toHaveProperty('spacing');
	});

	it('renders metadata blocks and section anatomy', () => {
		const out = createTransform(theme({ Member: blockless }))(memberTag()) as SerializedTag;
		const [eyebrow, body] = out.children.filter(isT);
		expect(eyebrow.attributes['data-name']).toBe('eyebrow');
		expect(eyebrow.attributes['data-zone-layout']).toBe('bar');
		expect(JSON.stringify(eyebrow)).toContain('Archivist');
		expect(body.attributes['data-name']).toBe('body');
		expect(body.attributes['data-section']).toBe('body');
	});

	it('differs from the same config with a block only by the block classes', () => {
		const a = createTransform(theme({ Member: withBlock }))(memberTag()) as SerializedTag;
		const b = createTransform(theme({ Member: blockless }))(memberTag()) as SerializedTag;
		expect(allClasses(a)).toContain('rf-member');
		expect(allClasses(a)).toContain('rf-member--tinted');
		expect(b).toEqual(stripBlockClasses(a));
	});

	it('leaves nested runes with a block untouched', () => {
		const t = createTransform(theme({ Member: blockless, Hint: { block: 'hint' } }));
		const out = t(
			makeTag('article', { 'data-rune': 'member' }, [
				makeTag('aside', { 'data-rune': 'hint' }, []),
			]),
		) as SerializedTag;
		const hint = out.children.filter(isT).find((c) => c.attributes['data-rune'] === 'hint')!;
		expect(hint.attributes.class).toBe('rf-hint');
	});

	it('names the rune in engine diagnostics', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const t = createTransform(
			theme({ Group: { block: 'group' }, Member: { ...blockless, requiresParent: 'Group' } }),
		);
		t(memberTag());
		const messages = [...error.mock.calls, ...warn.mock.calls].map((c) => String(c[0]));
		expect(messages.some((m) => m.includes('`member` requires parent `group`'))).toBe(true);
		expect(messages.join('\n')).not.toContain('undefined');
	});

	it('passes theme-config validation', () => {
		const result = validateThemeConfig(theme({ Member: blockless }));
		expect(result.errors).toEqual([]);
	});
});

describe('block-less RuneConfig in structure contracts (SPEC-145 D2a)', () => {
	const contract = generateStructureContract(
		theme({
			Member: {
				...blockless,
				contextModifiers: { group: 'in-group' },
				staticModifiers: ['featured'],
				variants: { tone: { bright: { layout: { root: ['body', 'eyebrow'] } } } },
			},
		}),
	).runes.Member;

	/** Every string value anywhere in the contract. */
	const strings = (v: unknown): string[] =>
		typeof v === 'string'
			? [v]
			: Array.isArray(v)
				? v.flatMap(strings)
				: v && typeof v === 'object'
					? Object.values(v).flatMap(strings)
					: [];

	it('has no block and addresses the root by `data-rune`', () => {
		expect(contract).not.toHaveProperty('block');
		expect(contract.root).toBe('[data-rune="member"]');
		expect(contract.dataRune).toBe('member');
	});

	it('describes the rune by its `data-*` modifiers', () => {
		expect(contract.modifiers).toEqual({
			tone: { source: 'meta', default: 'neutral', dataAttribute: 'data-tone' },
			role: { source: 'meta', dataAttribute: 'data-role' },
			accent: { source: 'meta', dataAttribute: 'data-accent' },
		});
		expect(contract.inlineStyles).toEqual({ accent: '--member-accent' });
	});

	it('contains no BEM selectors, in the base contract or its variants', () => {
		expect(contract).not.toHaveProperty('elements');
		expect(contract).not.toHaveProperty('contextModifiers');
		expect(contract).not.toHaveProperty('staticModifiers');
		expect(contract.variants?.tone?.bright).toBeDefined();
		const all = strings(contract);
		expect(all.filter((s) => /(^|[\s.])rf-|__|--\{?value/.test(s))).toEqual([]);
		expect(all.some((s) => s.includes('undefined'))).toBe(false);
	});

	it('leaves a contract with a block unchanged in shape', () => {
		const full = generateStructureContract(theme({ Member: withBlock })).runes.Member;
		expect(full.block).toBe('member');
		expect(full.root).toBe('.rf-member');
		expect(full.modifiers?.tone.classPattern).toBe('.rf-member--{value}');
	});
});
