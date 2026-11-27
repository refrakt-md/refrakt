import { readFileSync, readdirSync } from 'node:fs';
import { createMarquise, load, printFinding, validateData } from './src/marquise.ts';
const dir = 'fixtures/m';
const sources = readdirSync(`${dir}/shapes`).map((f) => ({ file: `shapes/${f}`, text: readFileSync(`${dir}/shapes/${f}`, 'utf8') }));
const mq = createMarquise(sources);
console.log('== shape analysis (mq.findings)');
for (const f of mq.findings) console.log(printFinding(f));
console.log('excluded:', [...mq.shapes.values()].filter((s) => s.excluded).map((s) => s.name));
// examples
for (const s of mq.shapes.values()) for (const ex of s.examples) {
	const d = load(mq, ex.body, { path: `${s.file}#${ex.id}` });
	const got = d.findings.map((f) => f.id); const exp = ex.expect ?? [];
	console.log(`example ${s.name}#${ex.id}:`, JSON.stringify(got) === JSON.stringify(exp) ? 'ok' : `example-mismatch ${got}`);
}
const doc = load(mq, readFileSync(`${dir}/content/page.md`, 'utf8'), { path: 'content/page.md' });
console.log('\n== content/page.md findings');
for (const f of doc.findings) console.log(printFinding(f));
console.log('\n== records');
console.log(JSON.stringify(doc.records, null, 1));
console.log('\n== one finding object');
console.log(JSON.stringify(doc.findings.find((f) => f.id === 'attribute-value-invalid'), null, 1));
console.log('\n== data file content/grace.yaml');
const r = validateData(mq, 'person', 'content/grace.yaml', readFileSync(`${dir}/content/grace.yaml`, 'utf8'), '');
for (const f of r.findings) console.log(printFinding({ ...f, file: 'content/grace.yaml' }));
console.log(JSON.stringify(r.record));
