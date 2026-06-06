import { describe, it, expect } from 'vitest';
import { escapeFenceTags } from '../src/fence-escape.js';

const O = '\x01RFTO\x02';
const C = '\x01RFTC\x02';

describe('escapeFenceTags', () => {
  it('escapes {% %} inside a bare code fence', () => {
    const out = escapeFenceTags('```\n{% tag %}\n```');
    expect(out).toBe(`\`\`\`\n${O} tag ${C}\n\`\`\``);
  });

  it('escapes {% %} inside a language-tagged fence', () => {
    const out = escapeFenceTags('```js\n{% tag %}\n```');
    expect(out).toBe(`\`\`\`js\n${O} tag ${C}\n\`\`\``);
  });

  it('keeps fence tracking in sync across a fence with an info string (title/attrs)', () => {
    // Regression: a titled fence (```yaml title="…") must be recognised as a
    // fence opener so the closing ``` ends the fence — otherwise the tracker
    // desyncs and escapes tags that follow the fence.
    const src = [
      '```yaml title="config.ts"',
      'theme: x',
      '```',
      '',
      '{% /codegroup %}',
    ].join('\n');
    const out = escapeFenceTags(src);
    // The fence body is escaped…
    expect(out).toContain('theme: x');
    // …but the tag AFTER the closed fence is left intact (not escaped).
    expect(out).toContain('{% /codegroup %}');
    expect(out).not.toContain(`${O} /codegroup ${C}`);
  });

  it('escapes braces inside a tilde fence with an info string', () => {
    const out = escapeFenceTags('~~~md title="x"\n{% tag %}\n~~~');
    expect(out).toContain(`${O} tag ${C}`);
  });

  it('treats a fenced block followed by a thematic break and tags correctly', () => {
    const src = [
      '{% codegroup %}',
      '```yaml title="refrakt.config.ts"',
      'theme: x',
      '```',
      '{% /codegroup %}',
      '',
      '---',
      '',
      'Body.',
    ].join('\n');
    const out = escapeFenceTags(src);
    // Only the fence body is escaped; the closing tag, the `---`, and the body
    // all survive so the document structure parses as authored.
    expect(out).toContain('{% /codegroup %}');
    expect(out).toContain('\n---\n');
    expect(out).toContain('Body.');
  });
});
