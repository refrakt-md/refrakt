/**
 * Markdoc parses {% %} tag syntax even inside code fences, which can break
 * the document structure when unpaired tags inside a fence consume closing
 * tags from the outer document.
 *
 * These utilities escape tag delimiters inside code fences before parsing
 * and restore them after transformation.
 */

const OPEN_SENTINEL = '\x01RFTO\x02';
const CLOSE_SENTINEL = '\x01RFTC\x02';

/**
 * Escape `{%` and `%}` inside code fences so Markdoc doesn't parse them as tags.
 * Call this on raw markdown BEFORE passing to `Markdoc.parse()`.
 */
export function escapeFenceTags(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let fenceChar: string | null = null;
  let fenceLen = 0;

  for (const line of lines) {
    if (fenceChar === null) {
      const match = line.match(/^(`{3,}|~{3,})(\w*)\s*$/);
      if (match) {
        fenceChar = match[1][0];
        fenceLen = match[1].length;
      }
      result.push(line);
    } else {
      const re = new RegExp(`^\\${fenceChar}{${fenceLen},}\\s*$`);
      if (re.test(line)) {
        fenceChar = null;
        result.push(line);
      } else {
        result.push(
          line.replace(/\{%/g, OPEN_SENTINEL).replace(/%\}/g, CLOSE_SENTINEL),
        );
      }
    }
  }

  return result.join('\n');
}

/**
 * Restore escaped tag delimiters in fence content.
 * Called from the fence node transform after Markdoc processing.
 */
export function unescapeFenceContent(content: string): string {
  if (!content.includes('\x01')) return content;
  return content
    .replaceAll(OPEN_SENTINEL, '{%')
    .replaceAll(CLOSE_SENTINEL, '%}');
}
