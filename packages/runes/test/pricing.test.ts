import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

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
});
