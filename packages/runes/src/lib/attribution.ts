import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ItemModel } from '@refrakt-md/types';
import { resolveParagraphItem } from './resolver.js';

const { Tag } = Markdoc;
type Tag = InstanceType<typeof Markdoc.Tag>;

/**
 * SPEC-185 D6 — attribution is one shared part. Every quotation role that
 * carries a source reads it with this item model and renders it with
 * {@link renderAttribution}: a `**Name** — Source` paragraph, the name in bold,
 * then an optional source after a dash or a comma (SPEC-182 D6's reading).
 */
export const attributionItemModel: ItemModel = {
	fields: [
		{ name: 'name', match: 'strong' },
		{ name: 'source', match: 'text', pattern: /^\s*[-–—,]\s*(.+)$/, optional: true },
	],
};

/** The attribution read from a paragraph, or `undefined` when it is not one:
 *  a paragraph with no bold name. */
export function readAttribution(
	paragraph: Node | undefined,
): { name: string; source?: string } | undefined {
	if (!paragraph || paragraph.type !== 'paragraph') return undefined;
	const record = resolveParagraphItem(paragraph, attributionItemModel);
	const name = typeof record.name === 'string' ? record.name.trim() : '';
	if (!name) return undefined;
	const source = typeof record.source === 'string' ? record.source.trim() : '';
	return source ? { name, source } : { name };
}

/** `<figcaption>` with the name in `<cite>` and the source after it (D6). */
export function renderAttribution(record: { name?: unknown; source?: unknown }): Tag | undefined {
	const name = typeof record.name === 'string' ? record.name.trim() : '';
	if (!name) return undefined;
	const source = typeof record.source === 'string' ? record.source.trim() : '';
	const children: Tag[] = [new Tag('cite', { 'data-name': 'name' }, [name])];
	if (source) children.push(new Tag('span', { 'data-name': 'source' }, [source]));
	return new Tag('figcaption', {}, children);
}

/**
 * An attributed quotation in a role (SPEC-185 D1, D3.1): `<figure>` marked
 * with the role, holding the `<blockquote>` and its `<figcaption>`. The
 * blockquote is rendered through the config, so its own content transforms as
 * anywhere, and loses the quotation marker: the role is the figure's.
 */
export function renderAttributedQuote(
	role: string,
	quote: Node,
	attribution: { name: string; source?: string },
	config: Config,
): Tag {
	const rendered = Markdoc.transform([quote], config) as RenderableTreeNode[];
	const blockquote = rendered.find((n): n is Tag => Tag.isTag(n as never)) as Tag | undefined;
	if (blockquote?.attributes) delete blockquote.attributes['data-quote'];
	const caption = renderAttribution(attribution);
	return new Tag('figure', { 'data-quote': role }, [
		...(blockquote ? [blockquote] : []),
		...(caption ? [caption] : []),
	]);
}
