import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

/** Strip common leading whitespace from all lines. */
function dedent(text: string): string {
	const lines = text.split('\n');
	const indents = lines.filter(l => l.trim().length > 0).map(l => l.match(/^(\s*)/)?.[0].length ?? 0);
	const min = indents.length > 0 ? Math.min(...indents) : 0;
	return min > 0 ? lines.map(l => l.slice(min)).join('\n') : text;
}

const VOID_ELEMENTS = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
	'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Render Markdoc Tag tree to pretty-printed HTML, preserving structural attributes. */
function renderRuneHtml(nodes: Markdoc.RenderableTreeNode[], depth = 0): string {
	const indent = '  ';
	const lines: string[] = [];

	for (const node of nodes) {
		if (node === null || node === undefined) continue;
		if (typeof node === 'string') {
			const trimmed = node.trim();
			if (trimmed) lines.push(indent.repeat(depth) + escapeHtml(trimmed));
			continue;
		}
		if (typeof node === 'number') { lines.push(indent.repeat(depth) + String(node)); continue; }
		if (!Tag.isTag(node)) continue;

		const { name, attributes, children = [] } = node;
		if (!name) { lines.push(renderRuneHtml(children, depth)); continue; }

		// Build attributes, skipping $$mdtype
		const attrParts: string[] = [];
		for (const [k, v] of Object.entries(attributes ?? {})) {
			if (k === '$$mdtype') continue;
			if (v === undefined || v === null || v === false) continue;
			if (v === true) { attrParts.push(k); continue; }
			attrParts.push(`${k}="${escapeHtml(String(v))}"`);
		}
		const attrStr = attrParts.length ? ' ' + attrParts.join(' ') : '';
		const pad = indent.repeat(depth);

		if (VOID_ELEMENTS.has(name)) {
			lines.push(`${pad}<${name}${attrStr}>`);
			continue;
		}

		// Inline text-only children on the same line
		const allText = children.every((c: Markdoc.RenderableTreeNode) => typeof c === 'string' || typeof c === 'number');
		if (allText && children.length <= 1) {
			const text = children.map((c: Markdoc.RenderableTreeNode) => typeof c === 'string' ? escapeHtml(c) : String(c ?? '')).join('');
			lines.push(`${pad}<${name}${attrStr}>${text}</${name}>`);
			continue;
		}

		lines.push(`${pad}<${name}${attrStr}>`);
		const inner = renderRuneHtml(children, depth + 1);
		if (inner) lines.push(inner);
		lines.push(`${pad}</${name}>`);
	}

	return lines.join('\n');
}

class PreviewModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: String, required: false, matches: ['auto', 'light', 'dark'] })
	theme: string = 'auto';

	@attribute({ type: String, required: false, matches: ['narrow', 'medium', 'wide', 'full'] })
	width: string = 'wide';

	@attribute({ type: Boolean, required: false })
	source: boolean = false;

	@attribute({ type: String, required: false })
	responsive: string = '';

	transform() {
		// 1. Extract first direct fence child as source (fence always wins)
		const fenceIdx = this.node.children.findIndex(c => c.type === 'fence');
		let sourcePre: Markdoc.Tag<'pre'> | undefined;
		if (fenceIdx !== -1) {
			const fence = this.node.children.splice(fenceIdx, 1)[0];
			const lang = fence.attributes.language || 'shell';
			sourcePre = new Tag('pre', { 'data-language': lang }, [
				new Tag('code', { 'data-language': lang }, [fence.attributes.content])
			]) as Markdoc.Tag<'pre'>;
		}

		// 2. Auto-infer from children source (fallback when no fence)
		if (!sourcePre && this.source) {
			const raw = this.config.variables?.__source;
			if (typeof raw === 'string' && this.node.lines?.length >= 2) {
				const allLines = raw.split('\n');
				const start = this.node.lines[0] + 1;
				const end = this.node.lines[this.node.lines.length - 1] - 1;
				const childSource = dedent(allLines.slice(start, end).join('\n').trim());
				if (childSource) {
					sourcePre = new Tag('pre', { 'data-language': 'markdoc' }, [
						new Tag('code', { 'data-language': 'markdoc' }, [childSource])
					]) as Markdoc.Tag<'pre'>;
				}
			}
		}

		const children = this.transformChildren();

		// 3. Generate rune output HTML when source is present
		let htmlSourcePre: Markdoc.Tag<'pre'> | undefined;
		if (sourcePre) {
			const htmlString = renderRuneHtml(children.toArray());
			if (htmlString) {
				htmlSourcePre = new Tag('pre', { 'data-language': 'html' }, [
					new Tag('code', { 'data-language': 'html' }, [htmlString])
				]) as Markdoc.Tag<'pre'>;
			}
		}

		const titleMeta = this.title ? new Tag('meta', { content: this.title }) : undefined;
		const themeMeta = new Tag('meta', { content: this.theme });
		const widthMeta = new Tag('meta', { content: this.width });
		const responsiveMeta = this.responsive ? new Tag('meta', { content: this.responsive }) : undefined;

		const childNodes = [
			...(titleMeta ? [titleMeta] : []),
			themeMeta,
			widthMeta,
			...(responsiveMeta ? [responsiveMeta] : []),
			...(sourcePre ? [sourcePre] : []),
			...(htmlSourcePre ? [htmlSourcePre] : []),
			...children.toArray(),
		];

		return createComponentRenderable(schema.Preview, {
			tag: 'div',
			properties: {
				...(titleMeta ? { title: titleMeta } : {}),
				theme: themeMeta,
				width: widthMeta,
				...(responsiveMeta ? { responsive: responsiveMeta } : {}),
				...(sourcePre ? { source: sourcePre } : {}),
				...(htmlSourcePre ? { htmlSource: htmlSourcePre } : {}),
			},
			children: childNodes,
		});
	}
}

export const preview = createSchema(PreviewModel);
