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

/**
 * D6 — the inside form: a blockquote's last paragraph, `— **Name**, Source`.
 * The leading dash marks it (the model's `prefix`), so a quote ending in bold
 * text is not misread as its source. A composition declares it on its
 * `blockquote` field as a nested model's `position: last` paragraph.
 */
export const insideAttributionItemModel: ItemModel = {
	prefix: /^\s*[—–]\s*$/,
	fields: [
		{ name: 'name', match: 'strong' },
		{ name: 'source', match: 'text', pattern: /^\s*[,—–]\s*(.+)$/, optional: true },
	],
};

export type Attribution = { name: string; source?: string };

/** The attribution read from a paragraph, or `undefined` when it is not one:
 *  a paragraph with no bold name (or, for the inside form, no leading dash). */
export function readAttribution(
	paragraph: Node | undefined,
	model: ItemModel = attributionItemModel,
): Attribution | undefined {
	if (!paragraph || paragraph.type !== 'paragraph') return undefined;
	const record = resolveParagraphItem(paragraph, model);
	const name = typeof record.name === 'string' ? record.name.trim() : '';
	if (!name) return undefined;
	const source = typeof record.source === 'string' ? record.source.trim() : '';
	return source ? { name, source } : { name };
}

/** A record the resolver read (`<field>Data`) as an attribution. */
export function attributionFrom(record: unknown): Attribution | undefined {
	const r = (record ?? {}) as Record<string, unknown>;
	const name = typeof r.name === 'string' ? r.name.trim() : '';
	if (!name) return undefined;
	const source = typeof r.source === 'string' ? r.source.trim() : '';
	return source ? { name, source } : { name };
}

/**
 * D6 — a blockquote whose last paragraph is an inside attribution, split into
 * the quote without it and the attribution. `undefined` when it has none, or
 * when the attribution would be all there is: a quote needs words.
 */
export function splitInsideAttribution(
	blockquote: Node | undefined,
): { quote: Node; attribution: Attribution } | undefined {
	if (!blockquote || blockquote.type !== 'blockquote') return undefined;
	const children = blockquote.children ?? [];
	if (children.length < 2) return undefined;
	const attribution = readAttribution(children[children.length - 1], insideAttributionItemModel);
	if (!attribution) return undefined;
	const quote = new Markdoc.Ast.Node('blockquote', blockquote.attributes, children.slice(0, -1));
	quote.lines = blockquote.lines;
	return { quote, attribution };
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
	// A quote also carrying an inside attribution renders once: the
	// attribution given is the figure's caption.
	const inner = splitInsideAttribution(quote)?.quote ?? quote;
	const rendered = Markdoc.transform([inner], config) as RenderableTreeNode[];
	const blockquote = rendered.find((n): n is Tag => Tag.isTag(n as never)) as Tag | undefined;
	if (blockquote?.attributes) delete blockquote.attributes['data-quote'];
	const caption = renderAttribution(attribution);
	return new Tag('figure', { 'data-quote': role }, [
		...(blockquote ? [blockquote] : []),
		...(caption ? [caption] : []),
	]);
}
