import { describe, it, expect } from 'vitest';
import { stripCodeFences, parseChangelog } from './generate-changelog.mjs';

describe('stripCodeFences', () => {
  it('removes a fenced block and its markers', () => {
    const lines = [
      'before',
      '```markdoc',
      '{% snippet path="a.ts" /%}',
      '```',
      'after',
    ];
    expect(stripCodeFences(lines)).toEqual(['before', 'after']);
  });

  it('handles indented fences (changeset bodies nest under a bullet)', () => {
    const lines = [
      '  prose',
      '  ```ts',
      '  type X = 1;',
      '  ```',
      '  more prose',
    ];
    expect(stripCodeFences(lines)).toEqual(['  prose', '  more prose']);
  });

  it('keeps blank lines that fall inside a fence out of the output', () => {
    const lines = ['```', 'a', '', 'b', '```'];
    expect(stripCodeFences(lines)).toEqual([]);
  });

  it('leaves inline code spans untouched', () => {
    const lines = ['use `{% snippet %}` like this'];
    expect(stripCodeFences(lines)).toEqual(['use `{% snippet %}` like this']);
  });
});

describe('parseChangelog — rune examples never leak as live tags', () => {
  // The changelog is rendered through Markdoc (`{% changelog %}` in
  // releases.md), so any bare `{% ... %}` in an entry parses as a LIVE rune.
  // A `{% snippet %}` example in a changeset's fenced code block must not
  // survive into the flattened changelog — snippet throws at transform time
  // by design, which previously broke the site build (see the SPEC-062 fix).
  it('drops a fenced snippet example, keeping the surrounding prose', () => {
    const changelog = [
      '# @refrakt-md/runes',
      '',
      '## 0.15.0',
      '',
      '### Minor Changes',
      '',
      '- Snippet rune: embed a project file as a code block.',
      '',
      '  ```markdoc',
      '  {% snippet path="src/lib/foo.ts" /%}',
      '',
      '  {% codegroup %}',
      '  {% snippet path="examples/button.svelte" /%}',
      '  {% /codegroup %}',
      '  ```',
      '',
      '  Inline mentions like `{% snippet %}` stay readable.',
      '',
    ].join('\n');

    const versions = new Map();
    parseChangelog(changelog, versions);
    const entries = [...(versions.get('0.15.0') ?? [])];
    const joined = entries.join('\n');

    // No bare (un-backticked) Markdoc tag should appear.
    expect(joined).not.toMatch(/(^|[^`]){%\s*snippet/);
    expect(joined).not.toMatch(/(^|[^`]){%\s*codegroup/);

    // Prose either side of the fence survives.
    expect(joined).toContain('Snippet rune: embed a project file');
    expect(joined).toContain('Inline mentions like `{% snippet %}` stay readable.');
  });
});
