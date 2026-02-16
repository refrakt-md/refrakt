import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

describe('codegroup tag', () => {
  it('should create an Editor component from code fences with headings', () => {
    const result = parse(`{% codegroup %}
# JavaScript

\`\`\`js
const x = 1;
\`\`\`

# Python

\`\`\`python
x = 1
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Editor');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
  });

  it('should create tab structure from heading + fence pairs', () => {
    const result = parse(`{% codegroup %}
# JavaScript

\`\`\`js
const x = 1;
\`\`\`

# Python

\`\`\`python
x = 1
\`\`\`
{% /codegroup %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Editor');
    expect(tag).toBeDefined();

    // Codegroup wraps in tabs, which creates TabGroup/Tab
    const tabGroup = findTag(tag!, t => t.attributes.typeof === 'TabGroup');
    expect(tabGroup).toBeDefined();
  });
});
