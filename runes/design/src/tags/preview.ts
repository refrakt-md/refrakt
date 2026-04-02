import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';

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

/** Extract fence node from children, returning it separately. */
function extractFence(children: unknown[]): { fence: Node | undefined; rest: unknown[] } {
	const nodes = children as Node[];
	const fenceIdx = nodes.findIndex(c => c.type === 'fence');
	if (fenceIdx === -1) return { fence: undefined, rest: nodes };
	const fence = nodes[fenceIdx];
	return { fence, rest: [...nodes.slice(0, fenceIdx), ...nodes.slice(fenceIdx + 1)] };
}

export const preview = createContentModelSchema({
	attributes: {
		title: { type: String, required: false, description: 'Label shown in the preview card header.' },
		theme: { type: String, required: false, matches: ['auto', 'light', 'dark'], description: 'Background theme for the preview viewport: auto follows the page, light/dark forces a mode.' },
		source: { type: Boolean, required: false, description: 'Enable/disable showing the source code panel alongside the rendered preview.' },
		responsive: { type: String, required: false, description: 'Comma-separated viewport widths (e.g. "375,768,1024") for responsive preview frames.' },
	},
	contentModel: {
		type: 'custom',
		processChildren: (nodes, attributes) => {
			// Extract fence before normal content model processing
			const { fence, rest } = extractFence(nodes);
			// Pass fence through as a special marker node at the end
			if (fence) return [...rest, fence];
			return rest;
		},
		description: 'Extracts fence blocks for source display, passes remaining children for preview rendering.',
	},
	transform(resolved, attrs, config, node) {
		const title = attrs.title ?? '';
		const theme = attrs.theme ?? 'auto';
		const showSource = attrs.source ?? false;
		const responsive = attrs.responsive ?? '';

		const allChildren = asNodes(resolved.children);

		// 1. Extract fence child for source display
		let sourcePre: Markdoc.Tag<'pre'> | undefined;
		const fenceIdx = allChildren.findIndex(c => c.type === 'fence');
		let contentChildren: Node[];
		if (fenceIdx !== -1) {
			const fence = allChildren[fenceIdx];
			contentChildren = [...allChildren.slice(0, fenceIdx), ...allChildren.slice(fenceIdx + 1)];
			const lang = fence.attributes.language || 'shell';
			sourcePre = new Tag('pre', { 'data-language': lang }, [
				new Tag('code', { 'data-language': lang }, [fence.attributes.content])
			]) as Markdoc.Tag<'pre'>;
		} else {
			contentChildren = allChildren;
		}

		// 2. Auto-infer source from raw content (fallback when no fence)
		if (!sourcePre && showSource) {
			const raw = config.variables?.__source;
			if (typeof raw === 'string' && node.lines?.length >= 2) {
				const allLines = raw.split('\n');
				const start = node.lines[0] + 1;
				const end = node.lines[node.lines.length - 1] - 1;
				const childSource = dedent(allLines.slice(start, end).join('\n').trim());
				if (childSource) {
					sourcePre = new Tag('pre', { 'data-language': 'markdoc' }, [
						new Tag('code', { 'data-language': 'markdoc' }, [childSource])
					]) as Markdoc.Tag<'pre'>;
				}
			}
		}

		const children = new RenderableNodeCursor(
			Markdoc.transform(contentChildren, config) as RenderableTreeNode[],
		);

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

		const titleMeta = title ? new Tag('meta', { content: title }) : undefined;
		const themeMeta = new Tag('meta', { content: theme });
		const responsiveMeta = responsive ? new Tag('meta', { content: responsive }) : undefined;

		const childNodes = [
			...(titleMeta ? [titleMeta] : []),
			themeMeta,
			...(responsiveMeta ? [responsiveMeta] : []),
			...(sourcePre ? [sourcePre] : []),
			...(htmlSourcePre ? [htmlSourcePre] : []),
			...children.toArray(),
		];

		return createComponentRenderable({ rune: 'preview',
			tag: 'div',
			properties: {
				...(titleMeta ? { title: titleMeta } : {}),
				theme: themeMeta,
				...(responsiveMeta ? { responsive: responsiveMeta } : {}),
			},
			refs: {
				...(sourcePre ? { source: sourcePre } : {}),
				...(htmlSourcePre ? { 'html-source': htmlSourcePre } : {}),
			},
			children: childNodes,
		});
	},
});
