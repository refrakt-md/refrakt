import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { markdocSyntax, markdocFromMarkdown } from './micromark-markdoc.ts';

/** Blank out frontmatter (same length, newlines kept) so offsets stay the source's. */
export function blankFrontmatter(src: string): string {
  const m = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?\n|$)/.exec(src);
  if (!m) return src;
  return m[0].replace(/[^\n]/g, ' ') + src.slice(m[0].length);
}

export function locate(src: string) {
  return fromMarkdown(blankFrontmatter(src), {
    extensions: [markdocSyntax, gfmTable(), gfmStrikethrough({ singleTilde: false })],
    mdastExtensions: [markdocFromMarkdown, gfmTableFromMarkdown(), gfmStrikethroughFromMarkdown()],
  });
}
