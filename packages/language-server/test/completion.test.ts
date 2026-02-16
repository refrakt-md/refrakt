import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { provideCompletion } from '../src/providers/completion.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver';

// Helper to create a mock documents store and run completion
function complete(content: string, cursorOffset?: number) {
  const doc = TextDocument.create('file:///test.md', 'markdown', 1, content);
  const offset = cursorOffset ?? content.length;
  const position = doc.positionAt(offset);

  // Create a minimal documents mock
  const documents = {
    get: (uri: string) => uri === 'file:///test.md' ? doc : undefined,
  } as unknown as TextDocuments<TextDocument>;

  return provideCompletion(
    {
      textDocument: { uri: 'file:///test.md' },
      position,
    },
    documents,
  );
}

describe('tag name completion', () => {
  it('completes rune names after {%', () => {
    const items = complete('{% ');
    expect(items.length).toBeGreaterThan(40);
    expect(items.some(i => i.label === 'hint')).toBe(true);
    expect(items.some(i => i.label === 'hero')).toBe(true);
  });

  it('filters by prefix', () => {
    const items = complete('{% hi');
    expect(items.every(i => i.label.startsWith('hi'))).toBe(true);
    expect(items.some(i => i.label === 'hint')).toBe(true);
  });

  it('includes aliases', () => {
    const items = complete('{% call');
    expect(items.some(i => i.label === 'call-to-action')).toBe(true);
  });

  it('includes descriptions', () => {
    const items = complete('{% hint');
    const hint = items.find(i => i.label === 'hint');
    expect(hint).toBeDefined();
    expect(hint!.detail).toContain('Callout');
  });
});

describe('attribute name completion', () => {
  it('completes attribute names after tag name', () => {
    const items = complete('{% hint ');
    expect(items.some(i => i.label === 'type')).toBe(true);
  });

  it('filters by prefix', () => {
    const items = complete('{% hint ty');
    expect(items.every(i => i.label.startsWith('ty'))).toBe(true);
  });

  it('excludes already-set attributes', () => {
    const items = complete('{% hint type="note" ');
    expect(items.some(i => i.label === 'type')).toBe(false);
  });
});

describe('attribute value completion', () => {
  it('completes enum values', () => {
    const items = complete('{% hint type="');
    expect(items.some(i => i.label === 'note')).toBe(true);
    expect(items.some(i => i.label === 'warning')).toBe(true);
    expect(items.some(i => i.label === 'caution')).toBe(true);
    expect(items.some(i => i.label === 'check')).toBe(true);
  });

  it('filters values by prefix', () => {
    const items = complete('{% hint type="no');
    expect(items.some(i => i.label === 'note')).toBe(true);
    expect(items.some(i => i.label === 'warning')).toBe(false);
  });
});

describe('closing tag completion', () => {
  it('suggests unclosed tags', () => {
    const items = complete('{% hint type="note" %}Some text{% /');
    expect(items.some(i => i.label === 'hint')).toBe(true);
  });

  it('suggests innermost tag first', () => {
    const items = complete('{% tabs %}{% tab name="A" %}content{% /');
    // Innermost (tab) should be first
    expect(items[0].label).toBe('tab');
    expect(items[1].label).toBe('tabs');
  });

  it('filters by prefix', () => {
    const items = complete('{% tabs %}{% tab name="A" %}content{% /ta');
    expect(items.some(i => i.label === 'tab')).toBe(true);
    expect(items.some(i => i.label === 'tabs')).toBe(true);
  });
});
