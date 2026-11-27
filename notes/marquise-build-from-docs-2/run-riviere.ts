import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRiviere, against } from './src/riviere.ts';
import { printFinding } from './src/marquise.ts';
function source(dir: string) {
	const m = new Map<string, string>();
	const walk = (d: string) => { for (const f of readdirSync(d)) { const p = `${d}/${f}`; if (statSync(p).isDirectory()) walk(p); else m.set(p.slice(dir.length + 1), readFileSync(p, 'utf8')); } };
	walk(dir); m.delete('riviere.config.json'); return m;
}
function snap(v: string) {
	const dir = `fixtures/r/${v}`;
	const config = JSON.parse(readFileSync(`${dir}/riviere.config.json`, 'utf8'));
	const rv = createRiviere(config, { source: source(dir) });
	return { rv, c: rv.load() };
}
const A = snap('ancestor');
console.log('== rv.findings (instance)'); for (const f of A.rv.findings) console.log(printFinding(f));
console.log('\n== ancestor snapshot findings'); for (const f of A.c.findings) console.log(printFinding(f));
console.log('\n== entities'); console.log(A.c.entities.map((e) => `${e.collection}:${e.id}`).join('  '));
console.log('\n== mentions'); for (const m of A.c.mentions) console.log(`${m.file}:${m.line} ${m.cls} -> ${m.to ? m.to.collection + ':' + m.to.id : '?'}${m.region ? '#' + m.region : ''}${m.reviewed ? ` reviewed ${m.reviewed}: ${m.verdict}` : ''}`);
console.log('\n== query: find work "owner.role:engineer"'); { const r = A.c.find('work', 'owner.role:engineer'); console.log(r.result.map((e) => e.id), 'inconclusive:', r.inconclusive.map((e) => e.id)); }
console.log('== query: find people "-role:engineer"'); { const r = A.c.find('people', '-role:engineer'); console.log(r.result.map((e) => e.id), 'inconclusive (left out, reported once):', r.inconclusive.map((e) => e.id)); }
console.log('== query: find people "has:work"'); console.log(A.c.find('people', 'has:work').result.map((e) => e.id));
console.log('\n== export --jsonl'); console.log(A.c.exportJsonl());
const M = snap('main'), H = snap('head');
console.log('\n== head snapshot: mentions with markers'); for (const m of H.c.mentions.filter((x) => x.reviewed)) console.log(`${m.file}:${m.line} ${m.cls} -> ${m.to?.id}#${m.region} reviewed ${m.reviewed}: ${m.verdict}`);
console.log('\n== validate --against main (head vs main, merge-base = ancestor)');
const res = against(H.c, M.c, A.c);
for (const f of res.filter((x) => x.baseline === 'new')) console.log(`new       ${printFinding(f)}`);
console.log(`(${res.filter((x) => x.baseline === 'existing').length} existing)`);
for (const f of res.filter((x) => x.baseline === 'existing')) console.log(`existing  ${printFinding(f)}`);
console.log('\n== one --against finding object'); console.log(JSON.stringify(res.find((f) => f.id === 'id-collision')));
import { pairing } from './src/riviere.ts';
console.log('\n== pairing ancestor -> head (work only)');
for (const p of pairing(A.c, H.c).filter((x) => x.head.collection === 'work')) console.log(`stage ${p.stage}: ${p.base.id} (${p.base.file}) -> ${p.head.id} (${p.head.file})`);
console.log('unpaired head:', H.c.entities.filter((h) => h.collection === 'work' && !pairing(A.c, H.c).some((p) => p.head === h)).map((h) => h.id));
