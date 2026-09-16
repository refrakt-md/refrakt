import { describe, it, expect } from 'vitest';
import { createTransform } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import type { SerializedTag } from '@refrakt-md/types';
import { parse, findTag } from './helpers.js';
import { config as marketingConfig } from '../src/config.js';

// WORK-564 / BUG-015 — Lumina styled a tier's name and price by selecting on
// RDFa `property=` attributes. `.rf-tier p[property="price"]` was already dead:
// `property="price"` lands on `parsedPriceMeta`, a `<meta>`, never on the `<p>`,
// so the price rendered unstyled. Both rules now select the BEM element classes.
//
// `tier` is the sharpest case for the underlying rule. Once WORK-565 extends
// `schema="none"` past its single current caller, `stripSchemaOrg` would delete
// `property` wholesale here and unstyle the tier heading outright —
// presentation depending on the SEO channel, which is ADR-028's argument
// pointed the other way.

const themeConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: marketingConfig,
};

/** Tiers only render inside a pricing table, so transform the parent. */
function renderTier(content: string): SerializedTag {
	const pricing = findTag(parse(content) as any, (t) => t.attributes['data-rune'] === 'pricing');
	expect(pricing, 'no pricing in schema-transformed output').toBeDefined();
	const serialized = JSON.parse(JSON.stringify(pricing)) as SerializedTag;
	const out = createTransform(themeConfig)(serialized) as SerializedTag;
	const tier = findByAttr(out, 'data-rune', 'tier');
	expect(tier, 'no tier in transformed output').toBeDefined();
	return tier;
}

function findByAttr(node: any, attr: string, value: string): any {
	if (!node || typeof node !== 'object') return undefined;
	if (node.attributes?.[attr] === value) return node;
	for (const child of node.children ?? []) {
		const hit = findByAttr(child, attr, value);
		if (hit) return hit;
	}
	return undefined;
}

function findByClass(node: any, className: string): any {
	if (!node || typeof node !== 'object') return undefined;
	const cls = node.attributes?.class;
	if (typeof cls === 'string' && cls.split(/\s+/).includes(className)) return node;
	for (const child of node.children ?? []) {
		const hit = findByClass(child, className);
		if (hit) return hit;
	}
	return undefined;
}

const TIER = `{% pricing %}
# Plans

{% tier name="Pro" price="$19" %}
- Unlimited projects
{% /tier %}
{% /pricing %}`;

describe('tier styling selects BEM classes, not the schema.org channel (WORK-564)', () => {
	it('renders its name as .rf-tier__name', () => {
		const tier = renderTier(TIER);
		expect(findByClass(tier, 'rf-tier__name'), 'tier name has no .rf-tier__name').toBeDefined();
	});

	it('renders its price as .rf-tier__price', () => {
		// The rule this replaces was dead, so a tier's price has been rendering
		// without its 4xl bold type. Restoring it is a visible change.
		expect(findByClass(renderTier(TIER), 'rf-tier__price'), 'no .rf-tier__price').toBeDefined();
	});

	it('keeps `property="price"` on the meta, not on the styled node', () => {
		// The reason the old selector never matched — recorded so the next person
		// does not "fix" the CSS back onto the meta carrier.
		const tier = renderTier(TIER);
		const price = findByClass(tier, 'rf-tier__price');
		expect(price.attributes?.property).toBeUndefined();
	});

	it('reaches both nodes by class, whatever the schema channel does', () => {
		// The two nodes differ in exactly the way that made the old CSS a trap.
		//
		// The name *does* carry `property="name"` — legitimately, it is a real
		// schema property — which is what made selecting on it look reasonable and
		// kept that rule alive. The price carries no `property` at all, which is
		// why the same idiom went dead there and nobody noticed. Styling by class
		// is correct for both, and is the only thing true of both.
		//
		// `schema="none"` is not the demonstration it looks like: `stripSchemaOrg`
		// has exactly one caller (`accordion`), so the attribute does nothing on
		// `pricing` today and asserting it here would pass vacuously. WORK-565
		// extends it to every rune carrying a table, which is when the hazard the
		// work item describes becomes real for `tier`.
		const tier = renderTier(TIER);
		const name = findByClass(tier, 'rf-tier__name');
		const price = findByClass(tier, 'rf-tier__price');
		expect(name.attributes?.property, 'the name is expected to carry it').toBe('name');
		expect(
			price.attributes?.property,
			'the price never carried one — hence the dead rule',
		).toBeUndefined();
	});
});
