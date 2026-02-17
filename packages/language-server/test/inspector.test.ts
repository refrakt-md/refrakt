import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { inspectRuneAtPosition } from '../src/providers/inspector.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver';

function inspect(content: string, line: number, character = 0) {
  const doc = TextDocument.create('file:///test.md', 'markdown', 1, content);

  const documents = {
    get: (uri: string) => uri === 'file:///test.md' ? doc : undefined,
  } as unknown as TextDocuments<TextDocument>;

  return inspectRuneAtPosition(
    documents,
    'file:///test.md',
    { line, character },
  );
}

describe('inspectRuneAtPosition', () => {
  it('returns null for cursor outside any rune', () => {
    const result = inspect('Hello world\n\nJust text.', 0);
    expect(result).toBeNull();
  });

  it('returns null for unknown document', () => {
    const doc = TextDocument.create('file:///test.md', 'markdown', 1, '{% hero %}\n{% /hero %}');
    const documents = {
      get: () => undefined,
    } as unknown as TextDocuments<TextDocument>;

    const result = inspectRuneAtPosition(documents, 'file:///other.md', { line: 0, character: 5 });
    expect(result).toBeNull();
  });

  it('returns result for cursor inside a rune tag', () => {
    const content = '{% hero %}\n# Hello World\n{% /hero %}';
    const result = inspect(content, 1); // Cursor on the heading line inside hero
    expect(result).not.toBeNull();
    expect(result!.runeName).toBe('hero');
  });

  it('returns all 4 stage keys', () => {
    const content = '{% hero %}\n# Hello World\n{% /hero %}';
    const result = inspect(content, 1);
    expect(result).not.toBeNull();
    expect(result!.stages).toHaveProperty('ast');
    expect(result!.stages).toHaveProperty('transform');
    expect(result!.stages).toHaveProperty('serialized');
    expect(result!.stages).toHaveProperty('identity');
  });

  it('AST stage contains tag name', () => {
    const content = '{% hero %}\n# Hello World\n{% /hero %}';
    const result = inspect(content, 1);
    expect(result).not.toBeNull();
    const ast = result!.stages.ast as Record<string, unknown>;
    expect(ast.tag).toBe('hero');
    expect(ast.type).toBe('tag');
  });

  it('transform stage has content', () => {
    const content = '{% hero %}\n# Hello World\n{% /hero %}';
    const result = inspect(content, 1);
    expect(result).not.toBeNull();
    expect(result!.stages.transform).toBeDefined();
    expect(typeof result!.stages.transform).toBe('object');
  });

  it('serialized stage contains $$mdtype Tag', () => {
    const content = '{% hero %}\n# Hello World\n{% /hero %}';
    const result = inspect(content, 0);
    expect(result).not.toBeNull();
    const serialized = result!.stages.serialized as Record<string, unknown>;
    expect(serialized.$$mdtype).toBe('Tag');
  });

  it('identity stage is null when no workspaceRoot', () => {
    const content = '{% hero %}\n# Hello World\n{% /hero %}';
    const result = inspect(content, 1);
    expect(result).not.toBeNull();
    expect(result!.stages.identity).toBeNull();
    expect(result!.identityError).toBeDefined();
  });

  it('returns result for rune with attributes', () => {
    const content = '{% hint type="warning" %}\nBe careful!\n{% /hint %}';
    const result = inspect(content, 1);
    expect(result).not.toBeNull();
    expect(result!.runeName).toBe('hint');
  });

  it('returns null for cursor on plain text before runes', () => {
    const content = 'Some text\n\n{% hero %}\n# Hello\n{% /hero %}';
    const result = inspect(content, 0); // Cursor on "Some text"
    expect(result).toBeNull();
  });
});
