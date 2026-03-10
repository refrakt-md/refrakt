import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, resolveSequence, RenderableNodeCursor, pageSectionProperties, headingsToList } from '@refrakt-md/runes';
import { schema } from '../types.js';

// Kinds that use group/member heading structure
const GROUP_KINDS = ['class', 'interface', 'module'];

// ─── SymbolMember ────────────────────────────────────────────────

export const symbolMember = createContentModelSchema({
	attributes: {},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', greedy: true, optional: true },
		],
	},
	transform(resolved, _attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);
		const nameHeading = children.headings().limit(1);
		const hasName = nameHeading.count() > 0;
		const nameTag = new Tag('h4', {}, hasName ? nameHeading.next().children : []);
		const body = children.slice(hasName ? 1 : 0).wrap('div');

		return createComponentRenderable(schema.SymbolMember, {
			tag: 'section',
			properties: {
				name: nameTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [nameTag, body.next()],
		});
	},
});

// ─── SymbolGroup ─────────────────────────────────────────────────

export const symbolGroup = createContentModelSchema({
	attributes: {
		headingLevel: { type: Number, required: false, default: 4 },
	},
	contentModel: {
		type: 'custom',
		description: 'Converts headings at specified level to symbol-member tags',
		processChildren(nodes, attrs) {
			const level = attrs.headingLevel as number;
			const converted = headingsToList({ level })(nodes as Node[]);
			const n = converted.length - 1;
			if (!converted[n] || converted[n].type !== 'list') return nodes;

			const tags = converted[n].children.map(item => {
				return new Ast.Node('tag', {}, item.children, 'symbol-member');
			});

			converted.splice(n, 1, ...tags);
			return converted;
		},
	},
	transform(resolved, _attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(resolved.children as Node[], config) as RenderableTreeNode[],
		);
		const labelHeading = children.headings().limit(1);
		const hasLabel = labelHeading.count() > 0;
		const labelTag = new Tag('h3', {}, hasLabel ? labelHeading.next().children : []);
		const body = children.slice(hasLabel ? 1 : 0).wrap('div');

		return createComponentRenderable(schema.SymbolGroup, {
			tag: 'section',
			properties: {
				label: labelTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [labelTag, body.next()],
		});
	},
});

// ─── Symbol (main) ───────────────────────────────────────────────

const headerBodyFields = [
	{ name: 'header', match: 'heading|paragraph|image' as const, greedy: true, optional: true },
	{ name: 'body', match: 'heading|paragraph|fence|list|blockquote|tag|hr|table' as const, greedy: true, optional: true },
];

export const symbol = createContentModelSchema({
	attributes: {
		kind: { type: String, required: false, matches: ['function', 'class', 'interface', 'enum', 'type', 'module', 'hook', 'component'], default: 'function' },
		lang: { type: String, required: false, default: 'typescript' },
		since: { type: String, required: false, default: '' },
		deprecated: { type: String, required: false, default: '' },
		source: { type: String, required: false, default: '' },
		headingLevel: { type: Number, required: false, default: 2 },
	},
	contentModel: (attrs) => {
		if (GROUP_KINDS.includes(attrs.kind as string)) {
			return {
				type: 'custom' as const,
				description: 'Converts headings to symbol-group tags for group-kind symbols',
				processChildren(nodes: unknown[], innerAttrs: Record<string, unknown>) {
					const headingLvl = innerAttrs.headingLevel as number;
					const groupLevel = headingLvl + 1;
					const memberLevel = headingLvl + 2;

					const converted = headingsToList({ level: groupLevel })(nodes as Node[]);
					const n = converted.length - 1;
					if (!converted[n] || converted[n].type !== 'list') return nodes;

					const tags = converted[n].children.map(item => {
						return new Ast.Node('tag', { headingLevel: memberLevel }, item.children, 'symbol-group');
					});

					converted.splice(n, 1, ...tags);

					// Resolve the header/body split from the converted children
					return converted;
				},
			};
		}
		return {
			type: 'sequence' as const,
			fields: headerBodyFields,
		};
	},
	transform(resolved, attrs, config) {
		// When using custom model, resolved.children has the converted nodes — split manually
		let headerAstNodes: Node[];
		let bodyAstNodes: Node[];

		if (resolved.children) {
			const inner = resolveSequence(resolved.children as Node[], headerBodyFields);
			headerAstNodes = asNodes(inner.header);
			bodyAstNodes = asNodes(inner.body);
		} else {
			headerAstNodes = asNodes(resolved.header);
			bodyAstNodes = asNodes(resolved.body);
		}

		const header = new RenderableNodeCursor(
			Markdoc.transform(headerAstNodes, config) as RenderableTreeNode[],
		);
		const bodyStream = new RenderableNodeCursor(
			Markdoc.transform(bodyAstNodes, config) as RenderableTreeNode[],
		);

		const kindMeta = new Tag('meta', { content: attrs.kind });
		const langMeta = new Tag('meta', { content: attrs.lang });
		const sinceMeta = new Tag('meta', { content: attrs.since });
		const deprecatedMeta = new Tag('meta', { content: attrs.deprecated });
		const sourceMeta = new Tag('meta', { content: attrs.source });

		const bodyDiv = bodyStream.wrap('div');

		const children: any[] = [kindMeta, langMeta, sinceMeta, deprecatedMeta, sourceMeta];
		if (header.count() > 0) {
			children.push(header.wrap('header').next());
		}
		children.push(bodyDiv.next());

		return createComponentRenderable(schema.Symbol, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				kind: kindMeta,
				lang: langMeta,
				since: sinceMeta,
				deprecated: deprecatedMeta,
				source: sourceMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children,
		});
	},
});
