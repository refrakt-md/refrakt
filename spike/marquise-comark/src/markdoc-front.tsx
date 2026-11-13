// A Markdoc front end feeding Comark's renderers: Markdoc parses and resolves
// (shapes, variables, conditionals); the result is converted into a Comark
// document and rendered by @comark/react, which never sees Markdoc syntax.
import { readFileSync } from 'node:fs';
import Markdoc, {
	type Config,
	type Node,
	type RenderableTreeNode,
	type Schema,
} from '@markdoc/markdoc';

const { Tag } = Markdoc;
type Tag = InstanceType<typeof Tag>;
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MarkdownDocument } from '@comark/react';
import {
	findMissingFields,
	resolveContentModel,
} from '../../../packages/runes/src/lib/resolver.ts';
import { camel, loadShapes, resolverModel, type Shape } from './shapes.ts';
import { plain } from './plain.ts';
import { Hero } from '../components/Hero.tsx';
import type { CElement, CNode } from './adapter.ts';

/** Evaluate `{% if %}` / `{% else /%}` on the AST, so a content model sees
 *  the branch that applies rather than an `if` tag. */
function expandConditionals(nodes: Node[], config: Config): Node[] {
	return nodes.flatMap((n) => {
		if (n.type !== 'tag' || n.tag !== 'if') return [n];
		const condition = n.resolve(config).attributes.primary;
		const split = n.children.findIndex((c) => c.type === 'tag' && c.tag === 'else');
		const yes = split < 0 ? n.children : n.children.slice(0, split);
		const no = split < 0 ? [] : n.children.slice(split + 1);
		return expandConditionals(condition ? yes : no, config);
	});
}

function text(r: RenderableTreeNode): string {
	if (typeof r === 'string' || typeof r === 'number') return String(r);
	if (Tag.isTag(r)) return r.children.map(text).join('');
	return '';
}

/** A shape as a Markdoc tag schema. Its output is Comark's explicit form:
 *  props on the tag, every slot a `template` child. */
function shapeSchema(shape: Shape, opts: { conditionals: boolean }, missing: string[]): Schema {
	return {
		attributes: Object.fromEntries(Object.keys(shape.attributes).map((k) => [k, { type: String }])),
		transform(node, config) {
			const props: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(node.transformAttributes(config))) props[camel(k)] = v;
			for (const [k, def] of Object.entries(shape.attributes)) {
				if (props[camel(k)] === undefined && def.default !== undefined)
					props[camel(k)] = def.default;
			}
			const children = opts.conditionals
				? expandConditionals(node.children, config)
				: node.children;
			const model = resolverModel(shape);
			const { content: resolved } = resolveContentModel(children, model, props);
			const content: Record<string, any> =
				model.type === 'delimited'
					? Object.assign({}, ...model.zones.map((z: any) => (resolved as any)[z.name] ?? {}))
					: resolved;
			for (const f of findMissingFields(children, model, props)) missing.push(`${shape.name}.${f}`);

			const slots: Tag[] = [];
			for (const field of shape.fields) {
				const v = content[field.name];
				if (v === undefined) continue;
				const rendered = [Markdoc.transform(v as Node | Node[], config)].flat();
				if (field.as === 'text') props[camel(field.name)] = rendered.map(text).join('').trim();
				else if (field.as === 'inline') {
					const inner = rendered.flatMap((r) => (Tag.isTag(r) ? r.children : [r]));
					slots.push(new Tag('template', { name: field.name }, inner));
				} else slots.push(new Tag('template', { name: field.name }, rendered));
				if (field.itemModel) {
					// SPEC-200 D9 on Markdoc's AST: `href` read from the link `label` matched.
					const records = (content[`${field.name}Data`] ?? []) as Record<string, unknown>[];
					const items = ((v as Node).children ?? []).map((item, i) => {
						const link = item.children.flatMap((c) => c.children).find((c) => c.type === 'link');
						return { ...records[i], href: link?.attributes.href };
					});
					props[camel(field.name)] = items;
				}
			}
			return new Tag(shape.name, props, slots);
		},
	};
}

/** Markdoc's renderable tree is almost Comark's tuple tree already. */
function toComark(r: RenderableTreeNode): CNode[] {
	if (r === null || r === undefined || r === false) return [];
	if (typeof r === 'string' || typeof r === 'number') return [String(r)];
	if (Array.isArray(r)) return r.flatMap(toComark);
	if (!Tag.isTag(r)) return [];
	const attrs: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(r.attributes)) {
		if (v === undefined) continue;
		if (typeof v === 'string') attrs[k] = v;
		else attrs[`:${k}`] = JSON.stringify(v);
	}
	return [[r.name, attrs, ...r.children.flatMap(toComark)] as CElement];
}

const shapes = loadShapes('shapes');
const components = { hero: Hero, callout: plain(shapes.callout) };
const source = readFileSync('content/home.mdoc', 'utf8');

for (const run of [
	{
		label: 'variables set, showActions: true',
		variables: { user: { name: 'Ada' }, showActions: true },
		conditionals: true,
	},
	{
		label: 'showActions: false',
		variables: { user: { name: 'Ada' }, showActions: false },
		conditionals: true,
	},
	{
		label: 'without evaluating `if` before the content model',
		variables: { user: { name: 'Ada' }, showActions: true },
		conditionals: false,
	},
]) {
	const missing: string[] = [];
	const tags = Object.fromEntries(
		Object.values(shapes).map((s) => [s.name, shapeSchema(s, run, missing)]),
	);
	const config: Config = { tags, variables: run.variables };
	const article = Markdoc.transform(Markdoc.parse(source), config) as Tag;
	const document = { frontmatter: {}, meta: {}, nodes: article.children.flatMap(toComark) };
	console.log(`\n===== ${run.label}`);
	if (run.conditionals === false) console.log(JSON.stringify(document.nodes[0]).slice(0, 400));
	if (missing.length) console.log(`missing: ${missing.join(', ')}`);
	console.log(
		renderToString(createElement(MarkdownDocument, { value: document, components } as any)),
	);
}
