import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('codegroup tag', () => {
  it('should create a CodeGroup component from bare code fences', () => {
    const result = parse(`{% codegroup %}
\`\`\`js
const x = 1;
\`\`\`

\`\`\`python
x = 1
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'CodeGroup');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should create Tab and TabPanel children from fences', () => {
    const result = parse(`{% codegroup %}
\`\`\`js
const x = 1;
\`\`\`

\`\`\`python
x = 1
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'CodeGroup');
    const tabs = findAllTags(tag!, t => t.attributes.typeof === 'Tab');
    const panels = findAllTags(tag!, t => t.attributes.typeof === 'TabPanel');
    expect(tabs.length).toBe(2);
    expect(panels.length).toBe(2);
  });

  it('should auto-detect language as tab name', () => {
    const result = parse(`{% codegroup %}
\`\`\`js
const x = 1;
\`\`\`

\`\`\`python
x = 1
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'CodeGroup');
    const tabs = findAllTags(tag!, t => t.attributes.typeof === 'Tab');

    // Tab names should contain prettified language names
    const firstTabSpan = findTag(tabs[0], t => t.name === 'span');
    const secondTabSpan = findTag(tabs[1], t => t.name === 'span');
    expect(firstTabSpan?.children).toContain('JavaScript');
    expect(secondTabSpan?.children).toContain('Python');
  });

  it('should use custom labels when provided', () => {
    const result = parse(`{% codegroup labels="React, Vue" %}
\`\`\`js
const x = 1;
\`\`\`

\`\`\`js
const x = 1;
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'CodeGroup');
    const tabs = findAllTags(tag!, t => t.attributes.typeof === 'Tab');

    const firstTabSpan = findTag(tabs[0], t => t.name === 'span');
    const secondTabSpan = findTag(tabs[1], t => t.name === 'span');
    expect(firstTabSpan?.children).toContain('React');
    expect(secondTabSpan?.children).toContain('Vue');
  });

  it('should include title meta when title is provided', () => {
    const result = parse(`{% codegroup title="app.js" %}
\`\`\`js
const x = 1;
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'CodeGroup');
    const titleMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'title' && t.attributes.content === 'app.js');
    expect(titleMeta).toBeDefined();
  });

  it('should work with a single code fence', () => {
    const result = parse(`{% codegroup %}
\`\`\`js
const x = 1;
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'CodeGroup');
    expect(tag).toBeDefined();
    const tabs = findAllTags(tag!, t => t.attributes.typeof === 'Tab');
    expect(tabs.length).toBe(1);
  });
});
