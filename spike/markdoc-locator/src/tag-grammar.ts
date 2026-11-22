// Markdoc's own tag grammar (tag.pegjs), recompiled so attribute values carry their source offsets.
// The only change: values are wrapped in LocatedValue, which records where each one sits.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import peggy from 'peggy';

const require = createRequire(import.meta.url);
const grammarPath = require.resolve('@markdoc/markdoc/src/grammar/tag.pegjs');

let src = readFileSync(grammarPath, 'utf8');
src = src.replace('const {Variable, Function} = options;', 'const Variable = function(p){this.path=p}; const Function = function(n,p){this.name=n;this.parameters=p};');
src = src.replace(
  /primary:\(\n\s*value:Value _\? \{ return value; \}\n\s*\)\?/,
  'primary:(\n    value:LocatedValue _? { return value; }\n  )?',
);
src = src.replace("attributes.unshift({type: 'attribute', name: 'primary', value: primary});",
  "attributes.unshift({type: 'attribute', name: 'primary', value: primary.value, at: primary.at});");
src = src.replace(/TagAttribute =\n\s*name:Identifier\n\s*'='\n\s*value:Value \{\n\s*return \{type: 'attribute', name, value\};\n\s*\}/,
  "TagAttribute =\n  name:Identifier\n  '='\n  value:LocatedValue {\n    return {type: 'attribute', name, value: value.value, at: value.at};\n  }");
src = src.replace(/TagShortcutId 'id' =\n\s*'#'\n\s*value:Identifier \{\n\s*return \{type: 'attribute', name: 'id', value\};\n\s*\}/,
  "TagShortcutId 'id' =\n  '#'\n  value:Identifier {\n    const l = location(); return {type: 'attribute', name: 'id', value, at: [l.start.offset + 1, l.end.offset]};\n  }");
src += `
LocatedValue =
  value:Value { const l = location(); return { value, at: [l.start.offset, l.end.offset] }; }
`;
for (const must of ['LocatedValue _?', 'value:LocatedValue {', "name: 'id', value, at:"]) {
  if (!src.includes(must)) throw new Error(`grammar patch failed: ${must}`);
}
const parser = peggy.generate(src, { allowedStartRules: ['Top'] });

export type LocatedAttr = { type: string; name: string; value: unknown; at?: [number, number] };
export type TagParse =
  | { type: 'tag' | 'tag_open'; meta: { tag: string; attributes: LocatedAttr[] } }
  | { type: 'tag_close'; meta: { tag: string } }
  | { type: 'annotation'; meta: { attributes: LocatedAttr[] } }
  | { type: 'variable'; meta: unknown };

/** Parse a tag's inner text (between `{%` and `%}`), with offsets relative to that text. */
export function parseTag(inner: string): TagParse | null {
  const lead = inner.length - inner.trimStart().length;
  try {
    const r = parser.parse(inner.trim()) as TagParse;
    if ('meta' in r && r.meta && 'attributes' in (r.meta as object)) {
      for (const a of (r.meta as { attributes: LocatedAttr[] }).attributes ?? []) {
        if (a.at) a.at = [a.at[0] + lead, a.at[1] + lead];
      }
    }
    return r;
  } catch {
    return null;
  }
}
