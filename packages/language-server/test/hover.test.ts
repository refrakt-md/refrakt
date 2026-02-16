import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { provideHover } from '../src/providers/hover.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver';

function hover(content: string, cursorOffset: number) {
  const doc = TextDocument.create('file:///test.md', 'markdown', 1, content);
  const position = doc.positionAt(cursorOffset);

  const documents = {
    get: (uri: string) => uri === 'file:///test.md' ? doc : undefined,
  } as unknown as TextDocuments<TextDocument>;

  return provideHover(
    {
      textDocument: { uri: 'file:///test.md' },
      position,
    },
    documents,
  );
}

describe('rune name hover', () => {
  it('shows hover for rune name', () => {
    const text = '{% hint type="note" %}';
    const offset = text.indexOf('hint') + 2; // Cursor on "hint"
    const result = hover(text, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toBeDefined();
    const value = (result!.contents as { value: string }).value;
    expect(value).toContain('hint');
    expect(value).toContain('Callout');
  });

  it('shows aliases in hover', () => {
    const text = '{% hint type="note" %}';
    const offset = text.indexOf('hint') + 2;
    const result = hover(text, offset);
    const value = (result!.contents as { value: string }).value;
    expect(value).toContain('callout');
  });

  it('shows hover for alias name', () => {
    const text = '{% callout type="note" %}';
    const offset = text.indexOf('callout') + 2;
    const result = hover(text, offset);
    expect(result).not.toBeNull();
  });

  it('shows reinterprets in hover', () => {
    const text = '{% hero %}';
    const offset = text.indexOf('hero') + 2;
    const result = hover(text, offset);
    const value = (result!.contents as { value: string }).value;
    expect(value).toContain('Reinterprets');
    expect(value).toContain('heading');
  });

  it('shows SEO type in hover', () => {
    const text = '{% recipe %}';
    const offset = text.indexOf('recipe') + 2;
    const result = hover(text, offset);
    const value = (result!.contents as { value: string }).value;
    expect(value).toContain('Recipe');
  });

  it('shows attributes in hover', () => {
    const text = '{% hint type="note" %}';
    const offset = text.indexOf('hint') + 2;
    const result = hover(text, offset);
    const value = (result!.contents as { value: string }).value;
    expect(value).toContain('Attributes');
    expect(value).toContain('type');
  });
});

describe('attribute name hover', () => {
  it('shows hover for attribute name', () => {
    const text = '{% hint type="note" %}';
    const offset = text.indexOf('type') + 2;
    const result = hover(text, offset);
    expect(result).not.toBeNull();
    const value = (result!.contents as { value: string }).value;
    expect(value).toContain('type');
    expect(value).toContain('hint');
  });

  it('shows enum values for attribute', () => {
    const text = '{% hint type="note" %}';
    const offset = text.indexOf('type') + 2;
    const result = hover(text, offset);
    const value = (result!.contents as { value: string }).value;
    expect(value).toContain('note');
    expect(value).toContain('warning');
  });
});

describe('no hover', () => {
  it('returns null outside tags', () => {
    const result = hover('Hello world', 5);
    expect(result).toBeNull();
  });

  it('returns null for unknown rune', () => {
    const text = '{% nonexistentrune %}';
    const offset = text.indexOf('nonexistentrune') + 2;
    const result = hover(text, offset);
    expect(result).toBeNull();
  });
});
