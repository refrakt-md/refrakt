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
		const body = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const device = attrs.device ?? 'browser';
		const color = attrs.color ?? 'dark';
		const statusBar = attrs.statusBar ?? true;
		const label = attrs.label ?? '';
		const url = attrs.url ?? '';
		const scale = attrs.scale ?? 1;
		const fit = attrs.fit ?? 'auto';

		// device / color / fit ride the bag only (→ the engine's modifiers set the
		// classes + data-* attrs). No field-metas in the tree.
		const deviceMeta = new Tag('meta', { content: device });
		const colorMeta = new Tag('meta', { content: color });
		const fitMeta = new Tag('meta', { content: fit });

		// SPEC-081: build the device-frame chrome here (deterministic from the
		// `device` value), not in a postTransform. Element classes come from
		// `data-name` (engine applies prefix-correct BEM); variants are `data-*`
		// attributes (`data-notch`, `data-light`) per the repo convention.
		const viewport = body.wrap('div').next() as InstanceType<typeof Tag>;
		viewport.attributes['data-name'] = 'viewport';

		const mobileDevices = ['iphone-15', 'iphone-se', 'pixel', 'phone'];
		const tabletDevices = ['ipad', 'tablet'];
		const isMobile = mobileDevices.includes(device);
		const isTablet = tabletDevices.includes(device);
		const isBrowser = device === 'browser' || device === 'browser-dark';
		const isMacbook = device === 'macbook';

		const notchStyle: Record<string, string> = { 'iphone-15': 'dynamic-island', 'iphone-se': 'classic', pixel: 'punch-hole' };

		const frameChildren: InstanceType<typeof Tag>[] = [];
		if (isMobile || isTablet) {
			const bezelChildren: InstanceType<typeof Tag>[] = [];
			if (isMobile && notchStyle[device]) {
				bezelChildren.push(new Tag('div', { 'data-name': 'notch', 'data-notch': notchStyle[device] }, []));
			}
			if (isMobile && statusBar) {
				bezelChildren.push(new Tag('div', { 'data-name': 'status-bar' }, [
					new Tag('span', { 'data-name': 'status-time' }, ['9:41']),
					new Tag('span', { 'data-name': 'status-icons' }, []),
				]));
			}
			bezelChildren.push(viewport);
			if (isMobile) bezelChildren.push(new Tag('div', { 'data-name': 'home-indicator' }, []));
			frameChildren.push(new Tag('div', { 'data-name': 'bezel' }, bezelChildren));
		} else if (isBrowser || isMacbook) {
			const titleBarChildren: InstanceType<typeof Tag>[] = [
				new Tag('div', { 'data-name': 'traffic-lights' }, [
					new Tag('span', { 'data-name': 'traffic-light', 'data-light': 'close' }, []),
					new Tag('span', { 'data-name': 'traffic-light', 'data-light': 'minimize' }, []),
					new Tag('span', { 'data-name': 'traffic-light', 'data-light': 'maximize' }, []),
				]),
			];
			if (isBrowser) {
				titleBarChildren.push(new Tag('div', { 'data-name': 'address-bar' },
					url ? [new Tag('span', { 'data-name': 'url' }, [url])] : []));
			}
			frameChildren.push(new Tag('div', { 'data-name': 'title-bar' }, titleBarChildren));
			frameChildren.push(viewport);
			if (isMacbook) {
				frameChildren.push(new Tag('div', { 'data-name': 'keyboard' }, [
					new Tag('div', { 'data-name': 'trackpad' }, []),
				]));
			}
		} else if (device === 'watch') {
			frameChildren.push(new Tag('div', { 'data-name': 'bezel' }, [viewport]));
		} else {
			frameChildren.push(viewport);
		}

		const children: InstanceType<typeof Tag>[] = [
			new Tag('div', { 'data-name': 'frame' }, frameChildren),
		];
		if (label) children.push(new Tag('div', { 'data-name': 'label' }, [label]));

		const node = createComponentRenderable({ rune: 'mockup',
			tag: 'div',
			properties: {
				device: deviceMeta,
				color: colorMeta,
				fit: fitMeta,
			},
			children,
		});

		// Scale as a CSS custom property (only when non-default, matching the
		// previous behaviour exactly).
		if (scale && scale !== 1) {
			const existing = node.attributes.style ? `${node.attributes.style}; ` : '';
			node.attributes.style = `${existing}--mockup-scale: ${scale}`;
		}
		return node;
	},
});
