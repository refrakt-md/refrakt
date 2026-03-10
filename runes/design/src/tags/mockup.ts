import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { useSchema } from '@refrakt-md/types';
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';

class Mockup {
	device: string = 'browser';
	label: string = '';
	color: string = 'dark';
	statusBar: string = 'true';
	url: string = '';
	scale: string = '1';
	fit: string = 'auto';
}

const MockupType = useSchema(Mockup).defineType('Mockup');

const deviceType = ['iphone-15', 'iphone-se', 'pixel', 'phone', 'ipad', 'tablet', 'browser', 'browser-dark', 'macbook', 'watch', 'none'] as const;
const colorType = ['dark', 'light', 'auto'] as const;
const fitType = ['auto', 'none'] as const;

export const mockup = createContentModelSchema({
	attributes: {
		device: { type: String, required: false, matches: deviceType.slice() },
		label: { type: String, required: false },
		color: { type: String, required: false, matches: colorType.slice() },
		statusBar: { type: Boolean, required: false },
		url: { type: String, required: false },
		scale: { type: Number, required: false },
		fit: { type: String, required: false, matches: fitType.slice() },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const device = attrs.device ?? 'browser';
		const color = attrs.color ?? 'dark';
		const statusBar = attrs.statusBar ?? true;
		const label = attrs.label ?? '';
		const url = attrs.url ?? '';
		const scale = attrs.scale ?? 1;
		const fit = attrs.fit ?? 'auto';

		const deviceMeta = new Tag('meta', { content: device });
		const colorMeta = new Tag('meta', { content: color });
		const statusBarMeta = new Tag('meta', { content: String(statusBar) });
		const labelMeta = label ? new Tag('meta', { content: label }) : undefined;
		const urlMeta = url ? new Tag('meta', { content: url }) : undefined;
		const scaleMeta = scale !== 1 ? new Tag('meta', { content: String(scale) }) : undefined;
		const fitMeta = fit !== 'auto' ? new Tag('meta', { content: fit }) : undefined;

		const viewport = children.wrap('div');

		const childNodes = [
			deviceMeta,
			colorMeta,
			statusBarMeta,
			...(labelMeta ? [labelMeta] : []),
			...(urlMeta ? [urlMeta] : []),
			...(scaleMeta ? [scaleMeta] : []),
			...(fitMeta ? [fitMeta] : []),
			viewport.next(),
		];

		return createComponentRenderable(MockupType, {
			tag: 'div',
			properties: {
				device: deviceMeta,
				color: colorMeta,
				statusBar: statusBarMeta,
				...(labelMeta ? { label: labelMeta } : {}),
				...(urlMeta ? { url: urlMeta } : {}),
				...(scaleMeta ? { scale: scaleMeta } : {}),
				...(fitMeta ? { fit: fitMeta } : {}),
			},
			refs: {
				viewport: viewport.tag('div'),
			},
			children: childNodes,
		});
	},
});
