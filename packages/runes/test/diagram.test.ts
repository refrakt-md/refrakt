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

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diagram');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('figure');
	});

	it('should pass language and title as meta', () => {
		const result = parse(`{% diagram language="mermaid" title="Architecture" %}
\`\`\`mermaid
graph LR
  A --> B
\`\`\`
{% /diagram %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diagram');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const language = metas.find(m => m.attributes.property === 'language');
		expect(language).toBeDefined();
		expect(language!.attributes.content).toBe('mermaid');

		const title = metas.find(m => m.attributes.property === 'title');
		expect(title).toBeDefined();
		expect(title!.attributes.content).toBe('Architecture');
	});

	it('should extract source code into refs', () => {
		const result = parse(`{% diagram %}
\`\`\`mermaid
graph TD
  Start --> End
\`\`\`
{% /diagram %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Diagram');
		const source = findTag(tag!, t => t.name === 'meta' && t.attributes['data-name'] === 'source');
		expect(source).toBeDefined();
		expect(source!.attributes.content).toContain('graph TD');
	});
});
