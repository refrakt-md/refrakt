import { readFileSync } from 'node:fs';
import { parseMarkdown } from 'comark';
import { renderMarkdown } from 'comark/render';
import { loadShapes } from './shapes.ts';
import { marquise, type Finding } from './plugin.ts';

const shapes = loadShapes('shapes');
for (const file of process.argv.slice(2)) {
	const findings: Finding[] = [];
	const doc = await parseMarkdown(readFileSync(file, 'utf8'), {
		plugins: [marquise(shapes, findings)()],
	});
	console.log(`\n===== ${file}`);
	console.log(JSON.stringify(doc.nodes));
	console.log('--- findings');
	for (const f of findings)
		console.log(
			`${file}:${f.line ?? '?'}  ${f.severity.padEnd(7)}  ${f.id.padEnd(30)}  ${f.message}`,
		);
	if (!findings.length) console.log('(none)');
	console.log('--- as explicit Comark');
	console.log(await renderMarkdown(doc));
}
