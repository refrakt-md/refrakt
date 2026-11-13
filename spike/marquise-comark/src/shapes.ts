// Shapes declared as Markdown files with YAML frontmatter, normalised into the
// arrays refrakt's resolver expects.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface AttributeDef {
	type: 'string' | 'number' | 'boolean';
	matches?: string[];
	default?: unknown;
	required?: boolean;
	description?: string;
}

export interface FieldDef {
	name: string;
	match: string;
	optional?: boolean;
	greedy?: boolean;
	as?: 'block' | 'inline' | 'text';
	itemModel?: { fields: { name: string; match?: string; from?: string; extract?: string }[] };
}

export interface Shape {
	name: string;
	description: string;
	attributes: Record<string, AttributeDef>;
	content: any;
	fields: FieldDef[];
	plain?: { tag?: string };
}

function fieldsOf(map: Record<string, any> | undefined): FieldDef[] {
	return Object.entries(map ?? {}).map(([name, def]) => ({ name, ...def }));
}

export function loadShapes(dir: string): Record<string, Shape> {
	const shapes: Record<string, Shape> = {};
	for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
		const src = readFileSync(join(dir, file), 'utf8');
		const m = src.match(/^---\n([\s\S]*?)\n---/);
		if (!m) throw new Error(`${file}: no frontmatter`);
		const fm = parseYaml(m[1]);
		const name = basename(file, '.md');
		const model = { ...fm.content };
		const fields: FieldDef[] = [];
		if (model.type === 'sequence') {
			model.fields = fieldsOf(model.fields);
			fields.push(...model.fields);
		} else if (model.type === 'delimited') {
			model.zones = model.zones.map((z: any) => {
				const zf = fieldsOf(z.fields);
				fields.push(...zf);
				return { ...z, fields: zf };
			});
		}
		shapes[name] = {
			name,
			description: fm.description ?? '',
			attributes: fm.attributes ?? {},
			content: model,
			fields,
			plain: fm.plain,
		};
	}
	return shapes;
}

/** The model handed to the resolver: item fields using `from` (SPEC-200 D9)
 *  are not something today's resolver understands, so they are removed and
 *  computed afterwards. */
export function resolverModel(shape: Shape): any {
	const strip = (fields: FieldDef[]) =>
		fields.map((f) =>
			f.itemModel ? { ...f, itemModel: { fields: f.itemModel.fields.filter((i) => !i.from) } } : f,
		);
	const m = shape.content;
	if (m.type === 'sequence') return { ...m, fields: strip(m.fields) };
	if (m.type === 'delimited')
		return { ...m, zones: m.zones.map((z: any) => ({ ...z, fields: strip(z.fields) })) };
	return m;
}

export const camel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
