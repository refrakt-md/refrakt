import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

// Kinds that use group/member heading structure
const GROUP_KINDS = ['class', 'interface', 'module'];

// ─── SymbolMember ────────────────────────────────────────────────

class SymbolMemberModel extends Model {
	transform(): RenderableTreeNodes {
		const children = this.transformChildren();
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
	}
}

export const symbolMember = createSchema(SymbolMemberModel);

// ─── SymbolGroup ─────────────────────────────────────────────────

class SymbolGroupModel extends Model {
	@attribute({ type: Number, required: false })
	headingLevel: number = 4;

	convertMemberHeadings(nodes: Node[]) {
		const level = this.headingLevel;
		const converted = headingsToList({ level })(nodes);
		const n = converted.length - 1;
		if (!converted[n] || converted[n].type !== 'list') return nodes;

		const tags = converted[n].children.map(item => {
			return new Ast.Node('tag', {}, item.children, 'symbol-member');
		});

		converted.splice(n, 1, ...tags);
		return converted;
	}

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertMemberHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();
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
	}
}

export const symbolGroup = createSchema(SymbolGroupModel);

// ─── Symbol (main) ───────────────────────────────────────────────

class SymbolModel extends Model {
	@attribute({ type: String, required: false, matches: ['function', 'class', 'interface', 'enum', 'type', 'module', 'hook', 'component'] })
	kind: string = 'function';

	@attribute({ type: String, required: false })
	lang: string = 'typescript';

	@attribute({ type: String, required: false })
	since: string = '';

	@attribute({ type: String, required: false })
	deprecated: string = '';

	@attribute({ type: String, required: false })
	source: string = '';

	@attribute({ type: Number, required: false })
	headingLevel: number = 2;

	@group({ include: ['heading', 'paragraph', 'image'] })
	header: NodeStream;

	@group({ include: ['fence', 'list', 'blockquote', 'tag', 'hr', 'table'] })
	body: NodeStream;

	convertGroupHeadings(nodes: Node[]) {
		if (!GROUP_KINDS.includes(this.kind)) return nodes;

		const groupLevel = this.headingLevel + 1;
		const memberLevel = this.headingLevel + 2;

		const converted = headingsToList({ level: groupLevel })(nodes);
		const n = converted.length - 1;
		if (!converted[n] || converted[n].type !== 'list') return nodes;

		const tags = converted[n].children.map(item => {
			return new Ast.Node('tag', { headingLevel: memberLevel }, item.children, 'symbol-group');
		});

		converted.splice(n, 1, ...tags);
		return converted;
	}

	processChildren(nodes: Node[]) {
		return super.processChildren(this.convertGroupHeadings(nodes));
	}

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const bodyStream = this.body.transform();

		const kindMeta = new Tag('meta', { content: this.kind });
		const langMeta = new Tag('meta', { content: this.lang });
		const sinceMeta = new Tag('meta', { content: this.since });
		const deprecatedMeta = new Tag('meta', { content: this.deprecated });
		const sourceMeta = new Tag('meta', { content: this.source });

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
	}
}

export const symbol = createSchema(SymbolModel);
