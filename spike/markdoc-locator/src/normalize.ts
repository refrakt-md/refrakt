// Reduce Markdoc's AST and the locator's mdast to one comparable sequence of events.
// Containers become open/close events; adjacent text is joined and whitespace collapsed.
import Markdoc from '@markdoc/markdoc';
import { parseTag } from './tag-grammar.ts';
import { locate } from './locate.ts';

import { escapeFenceTags } from '../../../packages/runes/src/fence-escape.ts';

const tokenizer = new Markdoc.Tokenizer({ allowIndentation: true });
// Refrakt's actual reader: tags inside fences escaped first, as refrakt does before every parse.
export const readMarkdoc = (src: string) => Markdoc.parse(tokenizer.tokenize(escapeFenceTags(src)));
const unescape = (s: string) => s.replace(/\x01RFTO\x02/g, '{%').replace(/\x01RFTC\x02/g, '%}');

class Seq {
  out: string[] = [];
  text = '';
  t(s: string) { this.text += s; }
  e(s: string) { this.flush(); this.out.push(s); }
  flush() { const s = this.text.replace(/\s+/g, ' ').trim(); if (s) this.out.push('T:' + s); this.text = ''; }
  done() { this.flush(); return this.out; }
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export function markdocEvents(src: string): string[] {
  const seq = new Seq();
  const walk = (n: any, parent?: any) => {
    const a = n.attributes ?? {};
    switch (n.type) {
      case 'document': case 'inline': n.children.forEach((c: any) => walk(c, n)); return;
      case 'text':
        if (typeof a.content === 'string') seq.t(a.content); else seq.e('VAR');
        return;
      case 'softbreak': case 'hardbreak': seq.t(' '); return;
      case 'code': seq.e('CODE:' + norm(a.content)); return;
      case 'fence': seq.e('FENCE:' + (a.language ?? '') + ':' + norm(unescape(a.content))); return;
      case 'hr': seq.e('HR'); return;
      case 'image': seq.e('IMG:' + a.src); return;
      case 'comment': return;
      case 'error': seq.e('ERR'); return;
    }
    const open = (() => {
      switch (n.type) {
        case 'heading': return 'H' + a.level;
        case 'paragraph': return parent?.type === 'item' ? null : 'P';
        case 'list': return a.ordered ? 'OL' : 'UL';
        case 'item': return 'LI';
        case 'blockquote': return 'BQ';
        case 'strong': return 'B'; case 'em': return 'I'; case 's': return 'DEL';
        case 'link': return 'A:' + a.href;
        case 'table': return 'TBL'; case 'tr': return 'TR'; case 'th': case 'td': return 'TD';
        case 'thead': case 'tbody': return null;
        case 'tag': return 'TAG:' + n.tag;
        default: return 'UNKNOWN:' + n.type;
      }
    })();
    if (open) seq.e(open);
    n.children.forEach((c: any) => walk(c, n));
    if (open) seq.e('/' + open.split(':')[0] + (open.startsWith('TAG:') ? open.slice(3) : ''));
  };
  walk(readMarkdoc(src));
  return seq.done();
}

export function locatorEvents(src: string): string[] {
  const seq = new Seq();
  // Markdoc's pairing rules, mirrored: an inline tag left open is closed at the end of its inline
  // container; a closing tag with nothing to close becomes an (erroneous) tag of its own.
  const openTags: { name: string; inline: boolean }[] = [];
  const closeInlineFrom = (depth: number) => {
    while (openTags.length > depth && openTags[openTags.length - 1].inline) seq.e('/TAG:' + openTags.pop()!.name);
  };
  const walk = (n: any, parent?: any) => {
    switch (n.type) {
      case 'root': n.children.forEach((c: any) => walk(c, n)); return;
      case 'text': seq.t(n.value); return;
      case 'break': seq.t(' '); return;
      case 'html': seq.t(n.value); return;
      case 'inlineCode': seq.e('CODE:' + norm(n.value)); return;
      case 'code': seq.e('FENCE:' + (n.lang ?? '') + ':' + norm(n.value)); return;
      case 'thematicBreak': seq.e('HR'); return;
      case 'image': seq.e('IMG:' + n.url); return;
      case 'markdocTag': {
        const inner = n.raw.slice(2, n.raw.lastIndexOf('%}'));
        const p = parseTag(inner);
        if (!p) { seq.e('ERR'); return; }
        if (p.type === 'annotation') return;
        if (p.type === 'variable') { seq.e('VAR'); return; }
        if (p.type === 'tag_close') {
          const i = openTags.map((o) => o.name).lastIndexOf(p.meta.tag);
          if (i === -1) { seq.e('TAG:' + p.meta.tag); seq.e('/TAG:' + p.meta.tag); return; }
          while (openTags.length > i + 1) seq.e('/TAG:' + openTags.pop()!.name);
          openTags.pop(); seq.e('/TAG:' + p.meta.tag); return;
        }
        seq.e('TAG:' + p.meta.tag);
        if (p.type === 'tag') seq.e('/TAG:' + p.meta.tag);
        else openTags.push({ name: p.meta.tag, inline: !n.block });
        return;
      }
    }
    const open = (() => {
      switch (n.type) {
        case 'heading': return 'H' + n.depth;
        case 'paragraph': return parent?.type === 'listItem' ? null : 'P';
        case 'list': return n.ordered ? 'OL' : 'UL';
        case 'listItem': return 'LI';
        case 'blockquote': return 'BQ';
        case 'strong': return 'B'; case 'emphasis': return 'I'; case 'delete': return 'DEL';
        case 'link': return 'A:' + n.url;
        case 'table': return 'TBL'; case 'tableRow': return 'TR'; case 'tableCell': return 'TD';
        default: return 'UNKNOWN:' + n.type;
      }
    })();
    const depth = openTags.length;
    if (open) seq.e(open);
    n.children.forEach((c: any) => walk(c, n));
    if (['paragraph', 'heading', 'tableCell'].includes(n.type) || (n.type === 'listItem')) closeInlineFrom(depth);
    if (open) seq.e('/' + open.split(':')[0]);
  };
  walk(locate(src));
  return seq.done();
}
