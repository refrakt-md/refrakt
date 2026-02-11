import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('cta tag', () => {
  it('should transform a basic call-to-action', () => {
    const result = parse(`{% cta %}
# Get Started Today

Build something amazing with our platform.

- [Sign Up](/signup)
- [Learn More](/docs)
{% /cta %}`);

    expect(result).toBeDefined();

    const ctaTag = findTag(result as any, t => t.attributes.typeof === 'CallToAction');
    expect(ctaTag).toBeDefined();
    expect(ctaTag!.name).toBe('section');
  });

  it('should work with the call-to-action alias', () => {
    const result = parse(`{% call-to-action %}
# Welcome

Get started now.

- [Start](/start)
{% /call-to-action %}`);

    const ctaTag = findTag(result as any, t => t.attributes.typeof === 'CallToAction');
    expect(ctaTag).toBeDefined();
  });

  it('should handle a code fence as a command action', () => {
    const result = parse(`{% cta %}
# Install

\`\`\`shell
npm install refract-md
\`\`\`
{% /cta %}`);

    const ctaTag = findTag(result as any, t => t.attributes.typeof === 'CallToAction');
    expect(ctaTag).toBeDefined();

    const command = findTag(ctaTag!, t => t.attributes.typeof === 'Command');
    expect(command).toBeDefined();
  });
});
