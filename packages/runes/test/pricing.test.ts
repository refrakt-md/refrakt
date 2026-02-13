import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { runes, extractSeo, buildSeoTypeMap } from '../src/index.js';

const seoTypeMap = buildSeoTypeMap(runes);

function seo(content: string) {
	const tree = parse(content);
	return extractSeo(tree, seoTypeMap, {} as any, '/test');
}

describe('pricing tag', () => {
	it('should transform a pricing section with tiers', () => {
		const result = parse(`{% pricing %}
## Choose Your Plan

Pick the plan that's right for you.

{% tier name="Free" priceMonthly="$0" %}
For individuals getting started.

- 1 project
- Basic support
{% /tier %}

{% tier name="Pro" priceMonthly="$29" %}
For professional developers.

- Unlimited projects
- Priority support

[Get Started](/signup/pro)
{% /tier %}
{% /pricing %}`);

		expect(result).toBeDefined();

		const pricingTag = findTag(result as any, t => t.attributes.typeof === 'Pricing');
		expect(pricingTag).toBeDefined();
		expect(pricingTag!.name).toBe('section');

		const tiers = findAllTags(pricingTag!, t => t.attributes.typeof === 'Tier');
		expect(tiers.length).toBe(2);
	});

	it('should support featured tier variant', () => {
		const result = parse(`{% pricing %}
## Plans

{% tier name="Basic" priceMonthly="$9" %}
Basic features.
{% /tier %}

{% tier name="Pro" priceMonthly="$29" featured=true %}
All features included.
{% /tier %}
{% /pricing %}`);

		const pricingTag = findTag(result as any, t => t.attributes.typeof === 'Pricing');
		expect(pricingTag).toBeDefined();

		const featured = findTag(pricingTag!, t => t.attributes.typeof === 'FeaturedTier');
		expect(featured).toBeDefined();
	});

	it('should accept price attribute (renamed from priceMonthly)', () => {
		const result = parse(`{% pricing %}
{% tier name="Starter" price="$5" %}
Features.
{% /tier %}
{% /pricing %}`);

		const tier = findTag(result as any, t => t.attributes.typeof === 'Tier');
		expect(tier).toBeDefined();

		const priceTag = findTag(tier!, t => t.attributes.property === 'price');
		expect(priceTag).toBeDefined();
		expect(priceTag!.children[0]).toBe('$5');
	});

	it('should convert headings with "Name — Price" pattern to tiers', () => {
		const result = parse(`{% pricing %}
## Free — $0
- 1 project
- Community support

## Pro — $19/mo
- Unlimited projects
- Priority support
{% /pricing %}`);

		const pricingTag = findTag(result as any, t => t.attributes.typeof === 'Pricing');
		expect(pricingTag).toBeDefined();

		const tiers = findAllTags(pricingTag!, t => t.attributes.typeof === 'Tier');
		expect(tiers.length).toBe(2);

		// Check first tier
		const nameTag0 = findTag(tiers[0], t => t.attributes.property === 'name');
		expect(nameTag0).toBeDefined();
		expect(nameTag0!.children[0]).toBe('Free');

		const priceTag0 = findTag(tiers[0], t => t.attributes.property === 'price');
		expect(priceTag0).toBeDefined();
		expect(priceTag0!.children[0]).toBe('$0');

		// Check second tier
		const nameTag1 = findTag(tiers[1], t => t.attributes.property === 'name');
		expect(nameTag1!.children[0]).toBe('Pro');

		const priceTag1 = findTag(tiers[1], t => t.attributes.property === 'price');
		expect(priceTag1!.children[0]).toBe('$19/mo');
	});

	it('should skip non-matching headings during conversion', () => {
		const result = parse(`{% pricing %}
# Choose Your Plan

## Free — $0
- 1 project

## Pro — $19/mo
- Unlimited projects
{% /pricing %}`);

		const pricingTag = findTag(result as any, t => t.attributes.typeof === 'Pricing');
		const tiers = findAllTags(pricingTag!, t => t.attributes.typeof === 'Tier');
		expect(tiers.length).toBe(2);
	});

	it('should support dash, en-dash, and em-dash separators', () => {
		const result = parse(`{% pricing %}
## Free - $0
Basic.

## Pro – $19
Standard.

## Enterprise — $99
Premium.
{% /pricing %}`);

		const pricingTag = findTag(result as any, t => t.attributes.typeof === 'Pricing');
		const tiers = findAllTags(pricingTag!, t => t.attributes.typeof === 'Tier');
		expect(tiers.length).toBe(3);
	});

	it('should extract URL from tier link', () => {
		const result = parse(`{% pricing %}
{% tier name="Pro" price="$29" %}
For professionals.

[Get Started](/signup/pro)
{% /tier %}
{% /pricing %}`);

		const tier = findTag(result as any, t => t.attributes.typeof === 'Tier');
		const urlTag = findTag(tier!, t => t.attributes.property === 'url');
		expect(urlTag).toBeDefined();
	});

	it('should extract description from tier body', () => {
		const result = parse(`{% pricing %}
{% tier name="Pro" price="$29" %}
For professionals who need more power.

- Feature A
{% /tier %}
{% /pricing %}`);

		const tier = findTag(result as any, t => t.attributes.typeof === 'Tier');
		const descTag = findTag(tier!, t => t.attributes.property === 'description');
		expect(descTag).toBeDefined();
	});

	it('should set data-columns on tier list', () => {
		const result = parse(`{% pricing %}
{% tier name="Free" price="$0" %}
Free.
{% /tier %}

{% tier name="Pro" price="$29" %}
Pro.
{% /tier %}

{% tier name="Enterprise" price="$99" %}
Enterprise.
{% /tier %}
{% /pricing %}`);

		const pricingTag = findTag(result as any, t => t.attributes.typeof === 'Pricing');
		const tiersList = findTag(pricingTag!, t => t.name === 'ul' && t.attributes['data-columns'] !== undefined);
		expect(tiersList).toBeDefined();
		expect(tiersList!.attributes['data-columns']).toBe(3);
	});

	it('should pass currency as meta tag', () => {
		const result = parse(`{% pricing %}
{% tier name="Pro" price="€29" currency="EUR" %}
Features.
{% /tier %}
{% /pricing %}`);

		const tier = findTag(result as any, t => t.attributes.typeof === 'Tier');
		const currencyMeta = findTag(tier!, t => t.name === 'meta' && t.attributes.property === 'currency');
		expect(currencyMeta).toBeDefined();
		expect(currencyMeta!.attributes.content).toBe('EUR');
	});

	it('should extract Product with correct offers from SEO', () => {
		const result = seo(`{% pricing %}
## Plans

Pick a plan.

{% tier name="Free" price="$0" %}
Free features.
{% /tier %}

{% tier name="Pro" price="$29" %}
Pro features.
{% /tier %}
{% /pricing %}`);

		expect(result.jsonLd).toHaveLength(1);
		const product = result.jsonLd[0] as any;
		expect(product['@type']).toBe('Product');
		expect(product.name).toBe('Plans');
		expect(product.offers).toHaveLength(2);
		expect(product.offers[0].name).toBe('Free');
		expect(product.offers[0].price).toBe('0');
		expect(product.offers[0].priceCurrency).toBe('USD');
		expect(product.offers[1].name).toBe('Pro');
		expect(product.offers[1].price).toBe('29');
	});

	it('should infer currency from price symbol in SEO', () => {
		const result = seo(`{% pricing %}
## Plans

{% tier name="Pro" price="€29" %}
Features.
{% /tier %}
{% /pricing %}`);

		const product = result.jsonLd[0] as any;
		expect(product.offers[0].priceCurrency).toBe('EUR');
	});

	it('should use explicit currency over inferred in SEO', () => {
		const result = seo(`{% pricing %}
## Plans

{% tier name="Pro" price="$29" currency="CAD" %}
Features.
{% /tier %}
{% /pricing %}`);

		const product = result.jsonLd[0] as any;
		expect(product.offers[0].priceCurrency).toBe('CAD');
	});
});
