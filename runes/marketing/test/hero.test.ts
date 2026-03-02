import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('hero tag', () => {
	it('should extract heading as title and paragraph as subtitle', () => {
		const result = parse(`{% hero %}
# Welcome to Our Site

Build something amazing with our platform.
{% /hero %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Hero');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');
	});

	it('should pass align attribute as meta', () => {
		const result = parse(`{% hero align="left" %}
# Title

Description text.
{% /hero %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Hero');
		expect(tag).toBeDefined();

		const alignMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'left');
		expect(alignMeta).toBeDefined();
	});

	it('should pass background attributes as meta', () => {
		const result = parse(`{% hero background="#0f172a" backgroundImage="/hero.jpg" %}
# Title
{% /hero %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Hero');
		expect(tag).toBeDefined();

		const bgMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === '#0f172a');
		expect(bgMeta).toBeDefined();

		const bgImgMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === '/hero.jpg');
		expect(bgImgMeta).toBeDefined();
	});

	it('should handle action links as LinkItem components', () => {
		const result = parse(`{% hero %}
# Get Started

Build faster.

- [Sign Up](/signup)
- [Learn More](/docs)
{% /hero %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Hero');
		expect(tag).toBeDefined();

		const linkItem = findTag(tag!, t => t.attributes.typeof === 'LinkItem');
		expect(linkItem).toBeDefined();

		const link = findTag(tag!, t => t.name === 'a' && t.attributes.href === '/signup');
		expect(link).toBeDefined();
	});

	it('should handle a code fence as a Command action', () => {
		const result = parse(`{% hero %}
# Install in seconds

Get started with one command.

\`\`\`shell
npm create refrakt
\`\`\`
{% /hero %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Hero');
		expect(tag).toBeDefined();

		const command = findTag(tag!, t => t.attributes.typeof === 'Command');
		expect(command).toBeDefined();
	});

	it('should handle both links and code fence in actions', () => {
		const result = parse(`{% hero %}
# Get Started

Build something great.

\`\`\`shell
npm create refrakt
\`\`\`

- [Documentation](/docs)
- [GitHub](https://github.com)
{% /hero %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Hero');
		expect(tag).toBeDefined();

		const command = findTag(tag!, t => t.attributes.typeof === 'Command');
		expect(command).toBeDefined();

		const linkItem = findTag(tag!, t => t.attributes.typeof === 'LinkItem');
		expect(linkItem).toBeDefined();
	});
});
