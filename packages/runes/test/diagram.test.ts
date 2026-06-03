import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('diagram tag', () => {
	it('should transform a code block into a diagram', () => {
		const result = parse(`{% diagram %}
\`\`\`mermaid
graph TD
  A --> B
  B --> C
\`\`\`
{% /diagram %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diagram');
		expect(tag).toBeDefined();
		// SPEC-081: the transform emits the rf-diagram custom element directly.
		expect(tag!.name).toBe('rf-diagram');
	});

	it('should carry language in the bag and render the title as a figcaption', () => {
		const result = parse(`{% diagram language="mermaid" title="Architecture" %}
\`\`\`mermaid
graph LR
  A --> B
\`\`\`
{% /diagram %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diagram');

		// SPEC-082: language rides the data-rune-fields bag (→ data-language).
		const fields = JSON.parse(tag!.attributes['data-rune-fields'] as string);
		expect(fields.language).toBe('mermaid');

		// SPEC-081: title is built as a figcaption, not a meta.
		const title = findTag(tag!, t => t.name === 'figcaption' && t.attributes['data-name'] === 'title');
		expect(title).toBeDefined();
		expect(title!.children).toContain('Architecture');
	});

	it('should render the source into a pre/code block', () => {
		const result = parse(`{% diagram %}
\`\`\`mermaid
graph TD
  Start --> End
\`\`\`
{% /diagram %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'diagram');
		const source = findTag(tag!, t => t.name === 'pre' && t.attributes['data-name'] === 'source');
		expect(source).toBeDefined();
		expect(JSON.stringify(source)).toContain('graph TD');
	});
});
