// Marquise as a Comark `post` plugin: for every component that is a known
// shape, validate its attributes, resolve its content model with refrakt's
// resolver, and rewrite it into Comark's explicit form (props + named slots).
import { defineComarkPlugin } from 'comark';
import {
	resolveContentModel,
	findMissingFields,
	findUnmatchedContent,
} from '../../../packages/runes/src/lib/resolver.ts';
import { toBlock, back, textOf, type CElement, type CNode } from './adapter.ts';
import { resolverModel, camel, type Shape, type FieldDef } from './shapes.ts';

export interface Finding {
	id: string;
	severity: 'error' | 'warning' | 'info';
	shape: string;
	line?: number;
	message: string;
}

const LINK_TAGS: Record<string, string> = {
	link: 'a',
	image: 'img',
	strong: 'strong',
	em: 'em',
	code: 'code',
};

function attributeValue(raw: unknown, key: string): unknown {
	if (key.startsWith(':') && typeof raw === 'string') {
		try {
			return JSON.parse(raw);
		} catch {
			return raw;
		}
	}
	return raw;
}

/** SPEC-200 D1: what a field delivers. */
function deliver(field: FieldDef, nodes: CNode[]): { kind: 'prop' | 'slot'; value: unknown } {
	if (field.as === 'text') return { kind: 'prop', value: nodes.map(textOf).join('').trim() };
	if (field.as === 'inline') {
		const inner = nodes.flatMap((n) =>
			Array.isArray(n) && /^(p|h[1-6])$/.test(n[0] as string) ? (n.slice(2) as CNode[]) : [n],
		);
		return { kind: 'slot', value: inner };
	}
	return { kind: 'slot', value: nodes };
}

/** SPEC-200 D9 and D10 on Comark list items: `from` fields read another
 *  field's node; each record keeps its item's content. */
function items(
	field: FieldDef,
	list: CElement,
	records: Record<string, unknown>[],
): Record<string, unknown>[] {
	const lis = list.slice(2) as CElement[];
	return records.map((rec, i) => {
		const li = lis[i];
		const out: Record<string, unknown> = { ...rec };
		for (const f of field.itemModel!.fields.filter((x) => x.from)) {
			const src = field.itemModel!.fields.find((x) => x.name === f.from);
			const tag = src?.match ? LINK_TAGS[src.match] : undefined;
			const node = (li.slice(2) as CNode[]).find((k) => Array.isArray(k) && k[0] === tag) as
				| CElement
				| undefined;
			if (node) out[f.name] = f.extract ? node[1][f.extract] : textOf(node);
		}
		return out;
	});
}

export function marquise(shapes: Record<string, Shape>, findings: Finding[]) {
	return defineComarkPlugin(() => ({
		name: 'marquise',
		post(state: any) {
			// Source lines come from the markdown-it tokens: Comark's tree does not
			// carry them, but every block component's open token has a line map.
			const lines: Record<string, number[]> = {};
			for (const t of state.tokens as any[]) {
				if (t.type !== 'mdc_block_open' || !t.map) continue;
				lines[t.tag] ??= [];
				lines[t.tag].push(t.map[0] + 1);
			}
			const seen: Record<string, number> = {};

			const rewrite = (n: CNode): CNode => {
				if (!Array.isArray(n)) return n;
				const [tag, attrs, ...kids] = n;
				const shape = tag ? shapes[tag] : undefined;
				// Tokens are in document order, parents first: take this shape's
				// line before recursing into its children.
				let line: number | undefined;
				if (shape && tag) {
					const index = (seen[tag] ?? -1) + 1;
					seen[tag] = index;
					line = lines[tag]?.[index];
				}
				const children = kids.map(rewrite);
				if (!shape) return [tag, attrs, ...children] as CElement;

				const report = (id: string, severity: Finding['severity'], message: string) =>
					findings.push({ id, severity, shape: shape.name, line, message });

				// Attributes: unknown, type and `matches`, defaults.
				const props: Record<string, unknown> = {};
				for (const [rawKey, raw] of Object.entries(attrs)) {
					if (rawKey === '$') continue;
					const key = rawKey.replace(/^:/, '');
					const def = shape.attributes[key];
					if (!def) {
						report('attribute-unknown', 'error', `${shape.name}: unknown attribute \`${key}\``);
						continue;
					}
					const value = attributeValue(raw, rawKey);
					if (def.matches && !def.matches.includes(String(value))) {
						report(
							'attribute-type-invalid',
							'error',
							`${shape.name}: ${key} must be one of ${def.matches.join(', ')} (got "${value}")`,
						);
						continue;
					}
					props[camel(key)] = value;
				}
				for (const [key, def] of Object.entries(shape.attributes)) {
					if (props[camel(key)] === undefined && def.default !== undefined)
						props[camel(key)] = def.default;
				}

				// Z1b: slots the author named explicitly fill fields directly; only
				// `#default` (or untemplated content) goes through the content model.
				const explicit: Record<string, CNode[]> = {};
				let rest: CNode[] = [];
				for (const c of children) {
					if (Array.isArray(c) && c[0] === 'template') {
						const name = c[1].name as string;
						if (name === 'default') rest.push(...(c.slice(2) as CNode[]));
						else explicit[name] = c.slice(2) as CNode[];
					} else rest.push(c);
				}
				rest = rest.filter((c) => !(typeof c === 'string' && c.trim() === ''));

				const ast = rest.map(toBlock);
				const model = resolverModel(shape);
				const { content: resolved } = resolveContentModel(ast, model, props);
				// A delimited model groups values by zone; fields are named uniquely
				// across zones, so flatten them.
				const content =
					model.type === 'delimited'
						? Object.assign({}, ...model.zones.map((z: any) => (resolved as any)[z.name] ?? {}))
						: resolved;
				const missing = findMissingFields(ast, model, props).filter((f) => !explicit[f]);
				for (const f of missing)
					report(
						'content-missing',
						'error',
						`${shape.name}: needs a ${f} (${shape.fields.find((x) => x.name === f)?.match})`,
					);
				for (const u of findUnmatchedContent(ast, model, props)) {
					report(
						'content-unmatched',
						'warning',
						`${shape.name}: a ${u.type} matches no field and would be dropped`,
					);
				}

				const slots: CElement[] = [];
				for (const field of shape.fields) {
					let nodes: CNode[] | undefined = explicit[field.name];
					if (!nodes) {
						const v = (content as any)[field.name];
						if (v === undefined) continue;
						nodes = (Array.isArray(v) ? v : [v]).map(back);
					}
					if (
						field.as === 'text' &&
						nodes.some((x) => Array.isArray(x) && (x.slice(2) as CNode[]).some(Array.isArray))
					) {
						report(
							'field-text-formatting-dropped',
							'info',
							`${shape.name}: formatting in ${field.name} is dropped (as: text)`,
						);
					}
					const out = deliver(field, nodes);
					if (out.kind === 'prop') props[camel(field.name)] = out.value;
					else slots.push(['template', { name: field.name }, ...(out.value as CNode[])]);
					if (field.itemModel) {
						const records = (content as any)[`${field.name}Data`] ?? [];
						props[camel(field.name)] = items(field, nodes[0] as CElement, records);
					}
				}

				// Arrays and objects travel as Comark's typed `:prop` form.
				const comarkProps: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(props)) {
					if (typeof v === 'string') comarkProps[k] = v;
					else comarkProps[`:${k}`] = JSON.stringify(v);
				}
				return [tag, comarkProps, ...slots] as CElement;
			};

			state.tree.nodes = (state.tree.nodes as CNode[]).map(rewrite);
		},
	}));
}
