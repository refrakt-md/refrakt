import { readFileSync } from 'node:fs';
import { parseMarkdown } from 'comark';
import { loadShapes } from './shapes.ts';
import { marquise, type Finding } from './plugin.ts';
const shapes = loadShapes('shapes');
const full = readFileSync('content/home.md', 'utf8');
for (const cut of [120, 200, 330]) {
	const findings: Finding[] = [];
	const doc = await parseMarkdown(full.slice(0, cut), {
		autoClose: true,
		plugins: [marquise(shapes, findings)()],
	} as any);
	const hero = (doc.nodes as any[]).find((n) => n[0] === 'hero');
	console.log(
		`--- first ${cut} chars: slots=${
			hero
				? hero
						.slice(2)
						.map((s: any) => s[1].name)
						.join(',')
				: '-'
		}  props=${hero ? Object.keys(hero[1]).join(',') : '-'}`,
	);
	for (const f of findings) console.log(`   ${f.severity} ${f.id}: ${f.message}`);
}
