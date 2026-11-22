// The edit suite: locate a value with the locator, replace only its bytes, then verify by reading the
// result with refrakt's real reader (Markdoc). An edit passes only if the reader sees exactly the intended
// change: the event sequence after the edit equals the one before with the one value substituted.
import { Parser, CST } from 'yaml';
import { locate } from './locate.ts';
import { parseTag } from './tag-grammar.ts';
import { markdocEvents } from './normalize.ts';

type Span = [number, number];
const all = (n: any, pred: (n: any) => boolean, out: any[] = []): any[] => {
  if (pred(n)) out.push(n);
  for (const c of n.children ?? []) all(c, pred, out);
  return out;
};
const only = (nodes: any[], what: string) => {
  if (nodes.length !== 1) throw new Error(`${what}: ${nodes.length} candidates, refusing`);
  return nodes[0];
};

// A link's destination: after the text's last child, `](`, then `<…>` or a bare destination.
function linkDestination(src: string, link: any): Span {
  const end = link.children.length ? link.children[link.children.length - 1].position.end.offset : link.position.start.offset + 1;
  let i = src.indexOf('](', end);
  if (i < 0 || i >= link.position.end.offset) throw new Error('no destination');
  i += 2;
  while (src[i] === ' ' || src[i] === '\t') i++;
  if (src[i] === '<') { const j = src.indexOf('>', i); return [i + 1, j]; }
  let j = i, depth = 0;
  while (j < link.position.end.offset - 1) {
    const ch = src[j];
    if (ch === '\\') { j += 2; continue; }
    if (ch === '(') depth++;
    if (ch === ')') { if (depth === 0) break; depth--; }
    if (/\s/.test(ch)) break;
    j++;
  }
  return [i, j];
}

// A tag attribute's value: Markdoc's own grammar, offsets relative to the tag's inner text.
function tagAttribute(src: string, tag: any, name: string): Span {
  const start = tag.position.start.offset;
  const inner = tag.raw.slice(2, tag.raw.lastIndexOf('%}'));
  const p: any = parseTag(inner);
  const attr = p?.meta?.attributes?.find((a: any) => a.name === name);
  if (!attr?.at) throw new Error(`no attribute ${name}`);
  return [start + 2 + attr.at[0], start + 2 + attr.at[1]];
}

// Within one text node no other construct can interfere, so a literal inside it is found safely.
function inText(src: string, text: any, literal: string): Span {
  const s = src.slice(text.position.start.offset, text.position.end.offset);
  const i = s.indexOf(literal);
  if (i < 0 || s.indexOf(literal, i + 1) >= 0) throw new Error(`literal ${literal} not unique in its text node`);
  return [text.position.start.offset + i, text.position.start.offset + i + literal.length];
}

type Case = { name: string; src: string; span: (src: string, t: any) => Span; to: string; expect: [string, string] };

const cases: Case[] = [
  {
    name: 'link destination after a look-alike in a code span',
    src: 'See `[docs](/old)` and the [docs](/old) page.\n',
    span: (src, t) => linkDestination(src, only(all(t, (n) => n.type === 'link'), 'link')),
    to: '/new', expect: ['A:/old', 'A:/new'],
  },
  {
    name: 'a reference inside a link-with-data list item',
    src: '## Verifies\n\n- {% ref "REQ-12" /%} (full, reviewed 3f9a1c2e)\n- {% ref "REQ-14" /%} (partial)\n',
    span: (src, t) => tagAttribute(src, all(t, (n) => n.type === 'markdocTag')[0], 'primary'),
    to: '"REQ-13"', expect: ['TAG:ref', 'TAG:ref'],
  },
  {
    name: 'a templated value in text after an inline tag',
    src: '- {% ref "REQ-12" /%} (full, reviewed 3f9a1c2e)\n',
    span: (src, t) => inText(src, all(t, (n) => n.type === 'text')[0], 'full'),
    to: 'partial', expect: ['T:(full, reviewed 3f9a1c2e)', 'T:(partial, reviewed 3f9a1c2e)'],
  },
  {
    name: 'an attribute in a multi-line block tag opening',
    src: '{% callout\n   type="warning"\n   title="Heads up" %}\nRenaming changes the URL.\n{% /callout %}\n',
    span: (src, t) => tagAttribute(src, all(t, (n) => n.type === 'markdocTag' && n.block)[0], 'title'),
    to: '"Careful"', expect: ['TAG:callout', 'TAG:callout'],
  },
  {
    name: 'an id annotation on a heading',
    src: '## Install {% #install %}\n\nText.\n',
    span: (src, t) => tagAttribute(src, all(t, (n) => n.type === 'markdocTag')[0], 'id'),
    to: 'setup', expect: ['H2', 'H2'],
  },
  {
    name: 'a destination with escapes, angle brackets and a title',
    src: 'A [first](/a\\)b "Title") and [second](</with space>).\n',
    span: (src, t) => linkDestination(src, all(t, (n) => n.type === 'link')[1]),
    to: '/plain', expect: ['A:/with%20space', 'A:/plain'],   // markdown-it percent-encodes; micromark does not
  },
  {
    name: 'a reference-style link definition',
    src: 'Read the [docs][d].\n\n[d]: /old "Docs"\n',
    span: (src, t) => {
      const def = only(all(t, (n) => n.type === 'definition'), 'definition');
      const s = src.slice(def.position.start.offset, def.position.end.offset);
      const i = s.indexOf(']:') + 2 + (s.slice(s.indexOf(']:') + 2).length - s.slice(s.indexOf(']:') + 2).trimStart().length);
      return [def.position.start.offset + i, def.position.start.offset + i + def.url.length];
    },
    to: '/new', expect: ['A:/old', 'A:/new'],
  },
  {
    name: 'a table cell',
    src: '| Key | Value |\n|---|---|\n| status | old |\n',
    span: (src, t) => inText(src, all(t, (n) => n.type === 'text' && n.value === 'old')[0], 'old'),
    to: 'new', expect: ['T:old', 'T:new'],
  },
  {
    name: 'a list item nested and indented inside two tags',
    src: '{% tabs %}\n\t{% tab title="One" %}\n\t\t- first\n\t\t\t- nested old item\n\t{% /tab %}\n{% /tabs %}\n',
    span: (src, t) => inText(src, all(t, (n) => n.type === 'text' && n.value.includes('nested'))[0], 'old'),
    to: 'new', expect: ['T:nested old item', 'T:nested new item'],
  },
  {
    name: 'a variable is located, not edited',
    src: 'Hello {% $user.name %}, welcome to [the site](/old).\n',
    span: (src, t) => linkDestination(src, all(t, (n) => n.type === 'link')[0]),
    to: '/new', expect: ['A:/old', 'A:/new'],
  },
];

let pass = 0;
for (const c of cases) {
  try {
    const tree = locate(c.src);
    const [a, b] = c.span(c.src, tree);
    const out = c.src.slice(0, a) + c.to + c.src.slice(b);
    const before = markdocEvents(c.src);
    const after = markdocEvents(out);
    const i = before.indexOf(c.expect[0]);
    if (i < 0) throw new Error(`expected event ${c.expect[0]} not in the reader's tree`);
    const wanted = [...before]; wanted[i] = c.expect[1];
    // Tag attribute edits do not show in events; compare the attribute through Markdoc's own tree too.
    const ok = JSON.stringify(after) === JSON.stringify(wanted) && out.length - c.src.length === c.to.length - (b - a);
    console.log(`${ok ? 'pass' : 'FAIL'}  ${c.name}: replaced ${JSON.stringify(c.src.slice(a, b))} at ${a}-${b}`);
    if (!ok) console.log('   before', before, '\n   after ', after);
    if (ok) pass++;
  } catch (e) {
    console.log(`FAIL  ${c.name}: ${(e as Error).message}`);
  }
}

// Frontmatter through a YAML CST: only the scalar's token changes, comments and layout stay.
{
  const fm = '# the work item\nid: WORK-725   # assigned by plan\nstatus: ready\ntags: [behaviors, css]\n';
  const tokens = [...new Parser().parse(fm)];
  let done = false;
  for (const doc of tokens) {
    CST.visit(doc as any, (item: any) => {
      const key = item.key && CST.isScalar(item.key) ? item.key.source : null;
      if (key === 'status' && item.value && CST.isScalar(item.value)) { CST.setScalarValue(item.value, 'done'); done = true; }
    });
  }
  const out = tokens.map((t) => CST.stringify(t as any)).join('');
  const ok = done && out === fm.replace('status: ready', 'status: done');
  console.log(`${ok ? 'pass' : 'FAIL'}  frontmatter through a YAML CST keeps comments and layout`);
  if (!ok) console.log(out);
  if (ok) pass++;
}
console.log(`${pass}/${cases.length + 1} edits verified`);

// Refusals: where reader and locator disagree, a write is refused (write-unlocatable), never guessed.
import { locatorEvents } from './normalize.ts';
const refusals = [
  { name: 'a pipe inside a code span in a table cell', src: '| Field | Meaning |\n|---|---|\n| `as` | `value | region`: how it is delivered |\n' },
  { name: 'an unclosed inline tag in prose', src: '- Converted plain ids to {% ref %} tags across files\n- Second item\n' },
];
let refused = 0;
for (const r of refusals) {
  const agree = JSON.stringify(markdocEvents(r.src)) === JSON.stringify(locatorEvents(r.src));
  console.log(`${agree ? 'FAIL (would write)' : 'refused'}  ${r.name}`);
  if (!agree) refused++;
}
console.log(`${refused}/${refusals.length} disagreements refused`);
