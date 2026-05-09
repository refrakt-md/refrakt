import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes, RenderableNodeCursor } from '@refrakt-md/runes';

const deviceType = ['iphone-15', 'iphone-se', 'pixel', 'phone', 'ipad', 'tablet', 'browser', 'browser-dark', 'macbook', 'watch', 'none'] as const;
const colorType = ['dark', 'light', 'auto'] as const;
const fitType = ['auto', 'none'] as const;

export const mockup = createContentModelSchema({
	attributes: {
		device: { type: String, required: false, matches: deviceType.slice(), description: 'Device frame to render around the content (e.g. iphone-15, browser, macbook).' },
		label: { type: String, required: false, description: 'Caption text shown below the device mockup.' },
		color: { type: String, required: false, matches: colorType.slice(), description: 'Device chrome color scheme: dark, light, or auto to match the page.' },
		statusBar: { type: Boolean, required: false, description: 'Enable/disable the status bar on phone and tablet device frames.' },
		url: { type: String, required: false, description: 'URL displayed in the browser address bar for browser-type devices.' },
		scale: { type: Number, required: false, description: 'Scaling factor for the mockup size (1 = default, 0.5 = half size).' },
		fit: { type: String, required: false, matches: fitType.slice(), description: 'Content fitting mode: auto scales to fill the viewport, none uses natural size.' },
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

		return createComponentRenderable({ rune: 'mockup',
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
