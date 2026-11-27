// Builds three versions of the Rivière fixture: ancestor (merge-base), main (the --against ref) and head (the branch).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { findSymbol, reviewHash } from '../src/anchoring.ts';

const loadTs = `import { read } from './read';

/** Build every page. */
export function build(pages: string[]): number {
	let n = 0;
	for (const p of pages) { n += read(p).length; }
	return n;
}
`;
// head: the same function, re-indented and re-spaced only
const loadTsReformatted = `import { read } from './read';

/** Build every page. */
export function build(pages: string[]): number {
    let n = 0;
    for (const p of pages) {   n += read(p).length;   }

    return n;
}
`;
const reg = findSymbol('src/load.ts', loadTs, 'build');
if (!reg.ok) throw new Error(reg.reason);
const h = reviewHash(reg.text);
const marker = `${h.strict.slice(0, 8)}:${h.loose.slice(0, 8)}`;

const shapes: Record<string, string> = {
	'shapes/person.md': `---
description: A person on the team
summary: [name]
attributes:
  name:    { type: string, required: true }
  role:    { type: string, matches: [engineer, designer, manager] }
  tags:    { type: string, list: true }
  contact:
    fields:
      email: { type: string }
riviere:
  inverse:
    work: { of: work.owner }
  rules:
    idle:
      when: 'role:engineer,designer -has:work'
      severity: warning
      message: "Nobody has given this person any work"
---
`,
	'shapes/work.md': `---
description: A unit of work
summary: [title, status]
attributes:
  status:   { type: string, matches: [ready, in-progress, done], default: ready }
  owner:    { type: ref, to: [person] }
  related:  { type: ref, to: [work], list: true }
  formerly: { type: string, list: true }
content:
  sequence:
    title: { match: heading:1, as: inline }
    body:  { match: any, repeat: true, optional: true }
---
`,
};
const common: Record<string, string> = {
	...shapes,
	'riviere.config.json': JSON.stringify({ collections: {
		work: { shape: 'work', include: 'plan/work/*.md', path: 'plan/work/{title:slug}.md', id: 'WORK-{n}', formerIds: 'formerly', mentions: { code: true } },
		people: { shape: 'person', include: 'team/*.yaml', id: { from: 'name' } },
		file: { generate: 'files' },
	} }, null, 2),
	'team/ada.yaml': 'name: Ada Lovelace\nrole: engineer\ntags: [math]\n',
	'team/grace.yaml': 'name: Grace Hopper\nrole: designer\n',
	'team/merlin.yaml': 'name: Merlin\nrole: wizard\n',
	'src/a/util.ts': 'export const util = 1;\n',
	'src/b/util.ts': 'export const util = 2;\n',
	'plan/work/typed-refs.md': `---
id: WORK-1
status: in-progress
owner: ada-lovelace
related: [WORK-2]
---

# Typed references

Owned by {% ref "ada-lovelace" /%}. The entry point is \`src/load.ts\`, and
[the loader](../../src/load.ts#build){% reviewed "${marker}" /%} reads each file.

Helpers live in \`util.ts\`, see {% ref "util.ts" /%} and {% ref "nobody-at-all" /%}.
`,
	'plan/work/wrong.md': `---
id: WORK-2
owner: WORK-1
related: [WORK-9, WORK-3]
---

# Wrong targets
`,
	'plan/work/renamed.md': '---\nid: WORK-3\nstatus: done\n---\n\n# To be renamed, recorded\n',
	'plan/work/handedit.md': '---\nid: WORK-4\n---\n\n# To be renamed by hand\n',
};
const versions: Record<string, Record<string, string>> = {
	ancestor: { ...common, 'src/load.ts': loadTs },
	main: { ...common, 'src/load.ts': loadTs, 'plan/work/collide-a.md': '---\nid: WORK-5\n---\n\n# Added on main\n' },
	head: {
		...common,
		'src/load.ts': loadTsReformatted,
		'plan/work/renamed.md': '---\nid: WORK-30\nstatus: done\nformerly: [WORK-3]\n---\n\n# To be renamed, recorded\n',
		'plan/work/handedit.md': '---\nid: WORK-40\n---\n\n# To be renamed by hand\n',
		'plan/work/newcomer.md': '---\nid: WORK-3\n---\n\n# Reuses a former id\n',
		'plan/work/collide-b.md': '---\nid: WORK-5\n---\n\n# Added on the branch\n',
	},
};
rmSync('fixtures/r', { recursive: true, force: true });
for (const [v, files] of Object.entries(versions)) for (const [p, t] of Object.entries(files)) {
	const full = `fixtures/r/${v}/${p}`; mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, t);
}
console.log('marker', marker, 'region lines', reg.startLine, '-', reg.endLine);
