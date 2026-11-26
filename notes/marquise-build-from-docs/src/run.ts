import * as fs from 'node:fs';
import * as path from 'node:path';
import { Marquise, Finding } from './marquise.ts';
import { createRiviere, against } from './riviere.ts';

const here = path.resolve(import.meta.dirname, '..');
const fmt = (f: Finding) =>
	`${(f.file ?? '-') + (f.line ? ':' + f.line : '')}`.padEnd(34) + ` ${f.severity.padEnd(7)} ${f.id.padEnd(24)} ${f.address}: ${f.message}` +
	(f.params ? `  ${JSON.stringify(f.params)}` : '') + (f.fix ? `  fix=${JSON.stringify(f.fix)}` : '');

const mcfg = JSON.parse(fs.readFileSync(path.join(here, 'marquise.config.json'), 'utf8'));
const mq = new Marquise({ namespaces: ['riviere'] });
for (const d of mcfg.shapes) mq.loadShapesDir(path.join(here, d));
console.log('== 1. Marquise: shape findings (mq.findings)');
for (const f of mq.findings) console.log(fmt({ ...f, file: path.relative(here, f.file ?? '') }));

console.log('\n== 1. Marquise: one document, fixtures/v1/content/tasks/sprint.md');
const src = fs.readFileSync(path.join(here, 'fixtures/v1/content/tasks/sprint.md'), 'utf8');
const doc = mq.load(src, { path: 'content/tasks/sprint.md' });
console.log('records:');
for (const r of doc.records()) console.log('  ' + JSON.stringify(r));
console.log('findings:');
for (const f of doc.findings) console.log(fmt(f));

const rcfg = JSON.parse(fs.readFileSync(path.join(here, 'riviere.config.json'), 'utf8'));
// shape `task` has a broken-on-purpose sibling (`note`), left out of collections.
const base = createRiviere(rcfg, { marquise: mq, root: path.join(here, 'fixtures/v1') }).load();
console.log('\n== 2. Rivière: snapshot of fixtures/v1');
console.log('entities:');
for (const e of base.entities) console.log(`  ${e.collection}:${e.id}  @${e.address}  former=${JSON.stringify(e.formerIds)}  links=${JSON.stringify(Object.fromEntries(Object.entries(e.links).map(([k, v]) => [k, v.map((x) => x.id)])))}`);
console.log('edges:');
for (const ed of base.edges) console.log(`  ${ed.from.id}.${ed.field} "${ed.written}" -> ${ed.to ? ed.to.collection + ':' + ed.to.id : '(unresolved)'}`);
console.log('corpus findings (Rivière-level only; Marquise document findings were printed above):');
for (const f of base.findings.filter((f) => !doc.findings.some((d) => d.id === f.id && d.address === f.address))) console.log(fmt(f));

const q = 'status:open,doing owner.role:engineer,intern';
console.log(`\n== 2. Query: c.find('tasks', '${q}')`);
for (const e of base.find('tasks', q)) console.log(`  ${e.id}  ${e.record.title?.text}`);
const q2 = '-has:tasks';
console.log(`== 2. Query: c.find('people', '${q2}')`);
for (const e of base.find('people', q2)) console.log(`  ${e.id}`);

const head = createRiviere(rcfg, { marquise: mq, root: path.join(here, 'fixtures/v2') }).load();
console.log('\n== 3. riviere validate --against v1 (head = fixtures/v2)');
for (const f of against(base, head)) console.log(fmt(f));

const head3 = createRiviere(rcfg, { marquise: mq, root: path.join(here, 'fixtures/v3') }).load();
console.log('\n== 3b. fixtures/v3 = v2 plus a new TASK-2 (a former id of TASK-20): snapshot findings');
for (const f of head3.findings.filter((f) => f.id.startsWith('id-') || f.id.startsWith('ref-'))) console.log(fmt(f));
console.log('   TASK-1.blockedBy now resolves to: ' + head3.edges.filter((e) => e.from.id === 'TASK-1' && e.field === 'blockedBy').map((e) => e.to?.id + ' (' + e.to?.record.title.text + ')').join(', '));
console.log('== 3b. validate --against v1 (head = fixtures/v3)');
for (const f of against(base, head3)) console.log(fmt(f));
