// Generate React prop types from shape files, following Comark's React
// conventions: attributes and `text` fields as props, item lists as arrays,
// every other field as a named slot, which Comark passes as `slot{Name}`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadShapes, camel } from './shapes.ts';

const pascal = (s: string) => camel(s).replace(/^./, (c) => c.toUpperCase());
const shapes = loadShapes('shapes');
const out: string[] = [
	'// Generated from shapes/*.md. Do not edit.',
	"import type { ReactNode } from 'react';",
	'',
];

for (const shape of Object.values(shapes)) {
	out.push(`/** ${shape.description} */`, `export interface ${pascal(shape.name)}Props {`);
	for (const [name, def] of Object.entries(shape.attributes)) {
		const type = def.matches ? def.matches.map((m) => `'${m}'`).join(' | ') : def.type;
		const optional = def.default === undefined && !def.required ? '?' : '';
		const doc = [
			`\`${name}\` in Markdown.`,
			def.description,
			def.default !== undefined ? `Default "${def.default}".` : '',
		]
			.filter(Boolean)
			.join(' ');
		out.push(`  /** ${doc} */`, `  ${camel(name)}${optional}: ${type};`);
	}
	for (const f of shape.fields) {
		const optional = f.optional ? '?' : '';
		if (f.as === 'text') out.push(`  ${camel(f.name)}${optional}: string;`);
		else out.push(`  slot${pascal(f.name)}${optional}: ReactNode;`);
		if (f.itemModel) {
			const record = f.itemModel.fields.map((i) => `${i.name}: string`).join('; ');
			out.push(`  ${camel(f.name)}${optional}: { ${record} }[];`);
		}
	}
	out.push('}', '');
}
mkdirSync('generated', { recursive: true });
writeFileSync('generated/shapes.d.ts', out.join('\n').replaceAll('\n  ', '\n\t'));
console.log(out.join('\n'));
