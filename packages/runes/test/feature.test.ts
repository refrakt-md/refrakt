import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('feature tag', () => {
  it('should transform a feature section with definitions', () => {
    const result = parse(`{% feature %}
## Our Features

- ### Fast
  Lightning-fast performance out of the box.

- ### Secure
  Enterprise-grade security built in.

- ### Scalable
  Grows with your needs.
{% /feature %}`);

    expect(result).toBeDefined();

    const featureTag = findTag(result as any, t => t.attributes.typeof === 'Feature');
    expect(featureTag).toBeDefined();
    expect(featureTag!.name).toBe('section');

    const definitions = findAllTags(featureTag!, t => t.attributes.typeof === 'FeatureDefinition');
    expect(definitions.length).toBe(3);
  });
});
