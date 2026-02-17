import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { Position, TextDocuments } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { serialize, serializeTree } from '@refrakt-md/runes';
import { createTransform } from '@refrakt-md/transform';
import { getMarkdocTags, getMarkdocNodes } from '../registry/loader.js';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const { Tag } = Markdoc;

export interface InspectorResult {
  runeName: string;
  stages: {
    ast: object;
    transform: object;
    serialized: object;
    identity: object | null;
  };
  identityError?: string;
}

/**
 * Find the innermost rune tag node at the given cursor position.
 * Walks the AST depth-first, preferring the deepest (most nested) tag
 * whose line range contains the cursor line.
 */
function findRuneAtPosition(ast: Node, line: number): Node | null {
  let best: Node | null = null;

  for (const node of ast.walk()) {
    if (node.type !== 'tag' || !node.tag) continue;
    if (!node.lines || node.lines.length === 0) continue;

    const startLine = node.lines[0];
    const endLine = node.lines[node.lines.length - 1];

    if (line >= startLine && line <= endLine) {
      // Prefer the innermost (deepest) tag — later matches in walk() are deeper
      // or same level but we want the most specific one, so always update
      if (!best || (node.lines.length <= best.lines.length)) {
        best = node;
      }
    }
  }

  return best;
}

/**
 * Summarize a Markdoc AST node for display in the inspector.
 */
function summarizeAstNode(node: Node): object {
  const summary: Record<string, unknown> = {
    type: node.type,
  };

  if (node.tag) summary.tag = node.tag;
  if (node.attributes && Object.keys(node.attributes).length > 0) {
    summary.attributes = node.attributes;
  }
  if (node.lines && node.lines.length > 0) {
    summary.lines = [node.lines[0], node.lines[node.lines.length - 1]];
  }

  if (node.children && node.children.length > 0) {
    summary.children = node.children.map(child => {
      if (child.type === 'tag' && child.tag) {
        return { type: 'tag', tag: child.tag };
      }
      return { type: child.type };
    });
  }

  return summary;
}

/**
 * Walk a renderable tree (Tag instances) to find a node whose typeof
 * attribute matches a given rune type.
 */
function findRenderableByTypeof(tree: RenderableTreeNode, runeName: string): RenderableTreeNode | null {
  if (tree === null || tree === undefined) return null;
  if (typeof tree === 'string' || typeof tree === 'number') return null;

  if (Tag.isTag(tree)) {
    // Rune schemas set typeof on the outermost rendered tag
    if (tree.attributes?.typeof) {
      // Check if this node's typeof relates to our rune
      // The typeof is typically the PascalCase schema type name
      return tree;
    }
    // Search children
    for (const child of tree.children) {
      const found = findRenderableByTypeof(child, runeName);
      if (found) return found;
    }
  }

  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = findRenderableByTypeof(child, runeName);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Walk the full transformed tree to collect all nodes with typeof,
 * in document order.
 */
function collectRenderablesByTypeof(tree: RenderableTreeNode): RenderableTreeNode[] {
  const results: RenderableTreeNode[] = [];

  function walk(node: RenderableTreeNode) {
    if (node === null || node === undefined) return;
    if (typeof node === 'string' || typeof node === 'number') return;

    if (Tag.isTag(node)) {
      if (node.attributes?.typeof) {
        results.push(node);
      }
      for (const child of node.children) {
        walk(child);
      }
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        walk(child);
      }
    }
  }

  walk(tree);
  return results;
}

/**
 * Summarize a renderable Tag node for display.
 */
function summarizeRenderable(node: RenderableTreeNode): object {
  if (node === null || node === undefined) return { value: null };
  if (typeof node === 'string') return { text: node };
  if (typeof node === 'number') return { value: node };

  if (Tag.isTag(node)) {
    const summary: Record<string, unknown> = {
      name: node.name,
    };
    if (node.attributes && Object.keys(node.attributes).length > 0) {
      summary.attributes = node.attributes;
    }
    if (node.children && node.children.length > 0) {
      summary.children = node.children.map(child => {
        if (Tag.isTag(child)) {
          const childSummary: Record<string, unknown> = { name: child.name };
          if (child.attributes?.typeof) childSummary.typeof = child.attributes.typeof;
          if (child.attributes?.property) childSummary.property = child.attributes.property;
          if (child.attributes?.['data-name']) childSummary['data-name'] = child.attributes['data-name'];
          return childSummary;
        }
        if (typeof child === 'string') return { text: child.slice(0, 50) };
        return { type: typeof child };
      });
    }
    return summary;
  }

  return { value: node };
}

/**
 * Try to load the theme's identity transform from the workspace.
 */
function loadThemeTransform(workspaceRoot: string): { transform: ((tree: any) => any) | null; error?: string } {
  try {
    const configPath = join(workspaceRoot, 'refrakt.config.json');
    const configText = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configText);

    if (!config.theme) {
      return { transform: null, error: 'No "theme" field in refrakt.config.json' };
    }

    const req = createRequire(join(workspaceRoot, 'package.json'));
    const themeTransform = req(`${config.theme}/transform`);
    const themeConfig = themeTransform.luminaConfig ?? themeTransform.default;

    if (!themeConfig) {
      return { transform: null, error: `Theme "${config.theme}" does not export a config` };
    }

    return { transform: createTransform(themeConfig) };
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return { transform: null, error: 'No refrakt.config.json found' };
    }
    if (err?.code === 'MODULE_NOT_FOUND') {
      return { transform: null, error: `Theme package not installed: ${err.message}` };
    }
    return { transform: null, error: `Failed to load theme: ${err.message}` };
  }
}

/**
 * Inspect the rune at the given cursor position, running the full
 * transformation pipeline and returning debug output for each stage.
 */
export function inspectRuneAtPosition(
  documents: TextDocuments<TextDocument>,
  uri: string,
  position: Position,
  workspaceRoot?: string,
): InspectorResult | null {
  const document = documents.get(uri);
  if (!document) return null;

  const text = document.getText();

  // Stage 1: Parse to AST
  const ast = Markdoc.parse(text);

  // Find the rune tag at cursor
  const runeNode = findRuneAtPosition(ast, position.line);
  if (!runeNode || !runeNode.tag) return null;

  const runeName = runeNode.tag;

  // Summarize AST for the found rune
  const astStage = summarizeAstNode(runeNode);

  // Stage 2: Transform
  const tags = getMarkdocTags();
  const nodes = getMarkdocNodes();
  const transformed = Markdoc.transform(ast, { tags, nodes });

  // Find the matching renderable node — collect all typeof nodes in order,
  // then find the one corresponding to our rune by matching tag name index
  const allTagNodes: Node[] = [];
  for (const node of ast.walk()) {
    if (node.type === 'tag' && node.tag) {
      allTagNodes.push(node);
    }
  }
  const runeIndex = allTagNodes.indexOf(runeNode);

  const allRenderables = collectRenderablesByTypeof(transformed);
  const matchedRenderable = runeIndex >= 0 && runeIndex < allRenderables.length
    ? allRenderables[runeIndex]
    : findRenderableByTypeof(transformed, runeName);

  const transformStage = matchedRenderable
    ? summarizeRenderable(matchedRenderable)
    : { error: 'Could not find transformed output for this rune' };

  // Stage 3: Serialize
  const serializedStage = matchedRenderable
    ? serialize(matchedRenderable) as object
    : { error: 'No transform output to serialize' };

  // Stage 4: Identity Transform (theme-dependent)
  let identityStage: object | null = null;
  let identityError: string | undefined;

  if (matchedRenderable && workspaceRoot) {
    const { transform, error } = loadThemeTransform(workspaceRoot);
    if (transform) {
      const serialized = serialize(matchedRenderable);
      identityStage = transform(serialized) as object;
    } else {
      identityError = error;
    }
  } else if (!workspaceRoot) {
    identityError = 'Workspace root not available';
  } else {
    identityError = 'No transform output for identity transform';
  }

  return {
    runeName,
    stages: {
      ast: astStage,
      transform: transformStage,
      serialized: serializedStage,
      identity: identityStage,
    },
    identityError,
  };
}
