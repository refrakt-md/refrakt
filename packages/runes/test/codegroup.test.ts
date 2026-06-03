import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

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
    expect(fields(tag).title).toBe('app.js');
  });

  it('should emit chrome-only (no tabs) for a single fence without labels', () => {
    const result = parse(`{% codegroup %}
\`\`\`js
const x = 1;
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
    expect(tag).toBeDefined();
    const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');
    expect(tabItems.length).toBe(0);
    const panels = findAllTags(tag!, t => t.name === 'div' && t.attributes['data-name'] === 'panel');
    expect(panels.length).toBe(0);
    // Code block should still be present
    const codeBlock = findTag(tag!, t => t.name === 'pre');
    expect(codeBlock).toBeDefined();
  });

  it('should still show tabs for a single fence with explicit labels', () => {
    const result = parse(`{% codegroup labels="MyFile" %}
\`\`\`js
const x = 1;
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
    expect(tag).toBeDefined();
    const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');
    expect(tabItems.length).toBe(1);
    const firstSpan = findTag(tabItems[0], t => t.name === 'span');
    expect(firstSpan?.children).toContain('MyFile');
  });

  // WORK-304 — fence `source` / `label` annotations drive tab labels when
  // group-level `labels=` isn't set. Precedence:
  //   `labels=` > per-fence `label` > derived from `source` (+ `:lines`) >
  //   prettified language name.
  describe('tab label precedence (WORK-304)', () => {
    it('falls back to basename of fence `source` when no labels/label set', () => {
      const result = parse(`{% codegroup %}
\`\`\`ts {% source="packages/types/src/theme.ts" %}
const x = 1;
\`\`\`

\`\`\`ts {% source="packages/runes/src/config.ts" %}
const y = 2;
\`\`\`
{% /codegroup %}`);

      const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
      const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');
      const labels = tabItems.map(t => {
        const span = findTag(t, x => x.name === 'span');
        return span?.children?.[0];
      });
      expect(labels).toEqual(['theme.ts', 'config.ts']);
    });

    it('appends `lines` to the basename when both are set on the fence', () => {
      const result = parse(`{% codegroup %}
\`\`\`ts {% source="packages/types/src/theme.ts" lines="74-125" %}
const x = 1;
\`\`\`
{% /codegroup %}`);

      const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
      // Force tab rendering by providing a labels attribute pattern (single
      // fence + no labels would be chrome-only) — use a fence label instead.
      // Easier: rely on the explicit-label variant.
      // For a single fence, chrome-only suppresses tabs. So check via a 2-fence case:
      const result2 = parse(`{% codegroup %}
\`\`\`ts {% source="packages/types/src/theme.ts" lines="74-125" %}
const x = 1;
\`\`\`

\`\`\`ts
const y = 2;
\`\`\`
{% /codegroup %}`);
      const tag2 = findTag(result2 as any, t => t.attributes['data-rune'] === 'code-group');
      const tabItems = findAllTags(tag2!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');
      const span = findTag(tabItems[0], x => x.name === 'span');
      expect(span?.children?.[0]).toBe('theme.ts:74-125');
      // Side-effect — also assert the silenced tag is not used:
      expect(tag).toBeDefined();
    });

    it('per-fence `label` annotation wins over `source`', () => {
      const result = parse(`{% codegroup %}
\`\`\`ts {% source="packages/types/src/theme.ts" label="SiteConfig" %}
const x = 1;
\`\`\`

\`\`\`ts
const y = 2;
\`\`\`
{% /codegroup %}`);

      const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
      const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');
      const span = findTag(tabItems[0], x => x.name === 'span');
      expect(span?.children?.[0]).toBe('SiteConfig');
    });

    it('group-level `labels=` still wins over per-fence annotations', () => {
      const result = parse(`{% codegroup labels="A, B" %}
\`\`\`ts {% source="theme.ts" label="X" %}
const x = 1;
\`\`\`

\`\`\`ts {% source="config.ts" %}
const y = 2;
\`\`\`
{% /codegroup %}`);

      const tag = findTag(result as any, t => t.attributes['data-rune'] === 'code-group');
      const tabItems = findAllTags(tag!, t => t.name === 'button' && t.attributes['data-name'] === 'tab');
      const labels = tabItems.map(t => {
        const span = findTag(t, x => x.name === 'span');
        return span?.children?.[0];
      });
      expect(labels).toEqual(['A', 'B']);
    });
  });
});
