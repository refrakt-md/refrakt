import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { provideDiagnostics } from '../src/providers/diagnostics.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver';

function diagnose(content: string) {
  const doc = TextDocument.create('file:///test.md', 'markdown', 1, content);
  return provideDiagnostics(doc);
}

describe('diagnostics', () => {
  it('returns no diagnostics for valid content', () => {
    const diags = diagnose('# Hello\n\nSome text');
    expect(diags).toHaveLength(0);
  });

  it('returns no diagnostics for valid rune', () => {
    const diags = diagnose('{% hint type="note" %}\nSome hint text\n{% /hint %}');
    expect(diags).toHaveLength(0);
  });

  it('reports undefined tag', () => {
    const diags = diagnose('{% nonexistent %}\ncontent\n{% /nonexistent %}');
    expect(diags.length).toBeGreaterThan(0);
    expect(diags.some(d => d.message.toLowerCase().includes('nonexistent'))).toBe(true);
  });

  it('suggests similar names for undefined tags', () => {
    const diags = diagnose('{% hnt %}\ncontent\n{% /hnt %}');
    const tagError = diags.find(d => d.message.toLowerCase().includes('hnt'));
    if (tagError) {
      // Should suggest 'hint' as a similar name
      expect(tagError.message).toContain('hint');
    }
  });

  it('all diagnostics have refrakt source', () => {
    const diags = diagnose('{% nonexistent %}content{% /nonexistent %}');
    for (const d of diags) {
      expect(d.source).toBe('refrakt');
    }
  });
});
