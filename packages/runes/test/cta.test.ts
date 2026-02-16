import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

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
npm install refrakt-md
\`\`\`
{% /cta %}`);

    const ctaTag = findTag(result as any, t => t.attributes.typeof === 'CallToAction');
    expect(ctaTag).toBeDefined();

    const command = findTag(ctaTag!, t => t.attributes.typeof === 'Command');
    expect(command).toBeDefined();
  });

  it('should handle action links as LinkItem components', () => {
    const result = parse(`{% cta %}
# Ready?

Take the next step.

- [Get Started](/start)
- [Learn More](/docs)
{% /cta %}`);

    const ctaTag = findTag(result as any, t => t.attributes.typeof === 'CallToAction');
    expect(ctaTag).toBeDefined();

    const linkItem = findTag(ctaTag!, t => t.attributes.typeof === 'LinkItem');
    expect(linkItem).toBeDefined();
  });
});
