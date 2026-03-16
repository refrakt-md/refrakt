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

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should create tab and panel children from fences', () => {
    const result = parse(`{% codegroup %}
\`\`\`js
const x = 1;
\`\`\`

\`\`\`python
x = 1
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
    const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');
    const panels = findAllTags(tag!, t => t.name === 'div' && t.attributes['data-name'] === 'panel');
    expect(tabItems.length).toBe(2);
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

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
    const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');

    // Tab names should contain prettified language names
    const firstSpan = findTag(tabItems[0], t => t.name === 'span');
    const secondSpan = findTag(tabItems[1], t => t.name === 'span');
    expect(firstSpan?.children).toContain('JavaScript');
    expect(secondSpan?.children).toContain('Python');
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

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
    const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');

    const firstSpan = findTag(tabItems[0], t => t.name === 'span');
    const secondSpan = findTag(tabItems[1], t => t.name === 'span');
    expect(firstSpan?.children).toContain('React');
    expect(secondSpan?.children).toContain('Vue');
  });

  it('should include title meta when title is provided', () => {
    const result = parse(`{% codegroup title="app.js" %}
\`\`\`js
const x = 1;
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
    const titleMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-field'] === 'title' && t.attributes.content === 'app.js');
    expect(titleMeta).toBeDefined();
  });

  it('should work with a single code fence', () => {
    const result = parse(`{% codegroup %}
\`\`\`js
const x = 1;
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
    expect(tag).toBeDefined();
    const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');
    expect(tabItems.length).toBe(1);
  });
});
