import Markdoc from '@markdoc/markdoc';
import type { Tag, Config, Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast } = Markdoc;
import { NodeFilter } from './interfaces.js';
import { isFilterMatching } from './lib/node.js';

export function generateIdIfMissing(node: Node, config: Config) {
  if (!config.variables?.generatedIds) {
    (config.variables as Record<string, any>).generatedIds = new Set<string>();
  }
  const generatedIds = config.variables?.generatedIds as Set<string>;

  if (!node.attributes.id) {
    const prefix = node.type === 'tag' ? node.tag : node.type;

    if (node.type === 'tag') {
      let index = 0;

      while (generatedIds.has(`${prefix}-${index}`)) {
        index++;
      }
      const id = `${prefix}-${index}`;
      generatedIds.add(id);
      node.attributes.id = id;
    }
  }
}

export function *walkTag(tag: Tag): Generator<RenderableTreeNode> {
  yield tag;
  for (const child of tag.children) {
    if (Markdoc.Tag.isTag(child)) {
      yield* walkTag(child);
    } else {
      yield child;
    }
  }
}

export interface HeadingsToListOptions {
  level?: number;

  include?: NodeFilter[];
}

export interface HeadingInfo {
  level: number;
  text: string;
  id: string;
  /** Canonical name of the known section this heading belongs to, if any. */
  knownSection?: string;
}

/**
 * Build a heading's `id` from its plain text.
 *
 * The single implementation behind both the parse-time heading index
 * (`extractHeadings`) and the rendered `<h*>` id (the `heading` node
 * transform). They used to be two near-copies that had drifted apart — one
 * stripped `?`, the other `?{}%` — so a heading containing `{`, `}` or `%` was
 * indexed under one id and rendered under another (BUG-005).
 *
 * The rules are the ones an author writing an anchor by hand already assumes,
 * and they match GitHub closely enough to be guessable: lowercase, drop
 * punctuation, collapse whitespace and separator runs to a single `-`. Dropping
 * punctuation also subsumes the reason `%` was stripped — a literal `%` not
 * followed by a hex pair used to crash SvelteKit's prerender crawler in
 * `decodeURI`.
 */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    // Keep letters, numbers, whitespace and hyphens; drop everything else.
    // Unicode-aware so non-ASCII headings keep their words rather than
    // collapsing to an empty id.
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Collect a heading node's plain text, including the content of inline `code`.
 *
 * Concatenated rather than joined with a space: the AST's own text nodes carry
 * the spacing, so joining would double it. Inline code used to be skipped
 * entirely — `` ### `fileRoots` — named directories `` indexed as
 * `" — named directories"`, losing the heading's actual subject (BUG-005).
 */
export function headingText(n: Node): string {
  let text = '';
  for (const child of n.walk()) {
    if ((child.type === 'text' || child.type === 'code') && child.attributes.content) {
      text += String(child.attributes.content);
    }
  }
  return text;
}

/**
 * Collect the plain text of already-transformed children, walking into tags.
 *
 * The renderable counterpart to {@link headingText}: inline code is a `Tag` by
 * this point, and a variable has been resolved to its value. Used for the
 * rendered heading id, where both of those matter.
 */
export function renderableText(children: RenderableTreeNode[]): string {
  let text = '';
  for (const child of children) {
    if (typeof child === 'string') text += child;
    else if (Markdoc.Tag.isTag(child)) text += renderableText(child.children ?? []);
  }
  return text;
}

/**
 * Pre-scan an AST for heading nodes, extracting their text and generating
 * IDs with {@link headingSlug} — the same slug rules the `heading` node
 * transform applies, so the index and the rendered anchor agree.
 *
 * The two necessarily read different phases: this runs at parse time, so a
 * heading whose text comes from a variable (`### {% $row.name %}` inside a
 * `{% data %}` body) is not knowable here and is indexed under its unresolved
 * form. The rendered anchor, which is what a link targets, is correct.
 */
export function extractHeadings(node: Node): HeadingInfo[] {
  const headings: HeadingInfo[] = [];

  function walk(n: Node) {
    if (n.type === 'heading') {
      const text = headingText(n);
      const id = n.attributes.id || headingSlug(text);

      headings.push({
        level: n.attributes.level,
        text,
        id,
      });
    }

    for (const child of n.children) {
      walk(child);
    }
  }

  walk(node);
  return headings;
}

/**
 * Find the text content of the first H1 heading in an AST.
 *
 * Walks depth-first, descending into both regular nodes and tag (rune)
 * children. The first `heading` node with `level: 1` wins. Used by the
 * content pipeline to derive `$page.title` when frontmatter doesn't set
 * one — matches the author mental model of "the page's title is the H1
 * the reader sees," including the common case where an H1 is wrapped in
 * a layout rune (hero etc.).
 */
export function firstH1(node: Node): string | undefined {
  let found: string | undefined;

  function walk(n: Node): boolean {
    if (n.type === 'heading' && n.attributes.level === 1) {
      const textParts: string[] = [];
      for (const child of n.walk()) {
        if (child.type === 'text' && child.attributes.content) {
          textParts.push(child.attributes.content);
        }
      }
      // Text nodes already carry their own surrounding whitespace, so joining
      // with `''` (rather than `' '`) avoids doubling spaces when a heading
      // contains inline formatting like `# Hello **strong** world`.
      found = textParts.join('');
      return true;
    }
    for (const child of n.children) {
      if (walk(child)) return true;
    }
    return false;
  }

  walk(node);
  return found;
}

export function headingsToList(options?: HeadingsToListOptions) {
  const explicitLevel = options?.level;
  const include = options?.include;

  return (nodes: Node[]) => {
    // Auto-detect level from first heading if not specified
    const level = explicitLevel ?? nodes.find(n => n.type === 'heading')?.attributes.level;
    if (!level) return nodes;
    let start: number | undefined;
    const list = new Ast.Node('list');
    const head: Node[] = [];
    let tail: Node[] = [];

    for (let i=0; i<nodes.length; i++) {
      const node = nodes[i];

      if (node.type === 'heading' && node.attributes.level === level) {
        list.children.push(new Ast.Node('item', {}, [node]));
        start = i;
      } else if (start === undefined) {
        head.push(node);
      } else if (!include || include.some(filter => isFilterMatching(node, filter))) {
        const lastItem = list.children.at(-1);
        if (lastItem) {
          lastItem.children.push(node);
        }
      } else {
        tail = nodes.slice(i);
        break;
      }
    }

    if (list.children.length === 0) {
      return nodes;
    }

    return [...head, list, ...tail];
  }
}
