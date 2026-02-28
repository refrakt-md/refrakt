import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const deviceType = ['iphone-15', 'iphone-se', 'pixel', 'phone', 'ipad', 'tablet', 'browser', 'browser-dark', 'macbook', 'watch', 'none'] as const;
const colorType = ['dark', 'light', 'auto'] as const;

class MockupModel extends Model {
	@attribute({ type: String, required: false, matches: deviceType.slice() })
	device: typeof deviceType[number] = 'browser';

	@attribute({ type: String, required: false })
	label: string = '';

	@attribute({ type: String, required: false, matches: colorType.slice() })
	color: typeof colorType[number] = 'dark';

	@attribute({ type: Boolean, required: false })
	statusBar: boolean = true;

	@attribute({ type: String, required: false })
	url: string = '';

	@attribute({ type: Number, required: false })
	scale: number = 1;

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const deviceMeta = new Tag('meta', { content: this.device });
		const colorMeta = new Tag('meta', { content: this.color });
		const statusBarMeta = new Tag('meta', { content: String(this.statusBar) });
		const labelMeta = this.label ? new Tag('meta', { content: this.label }) : undefined;
		const urlMeta = this.url ? new Tag('meta', { content: this.url }) : undefined;
		const scaleMeta = this.scale !== 1 ? new Tag('meta', { content: String(this.scale) }) : undefined;

		const viewport = children.wrap('div');

		const childNodes = [
			deviceMeta,
			colorMeta,
			statusBarMeta,
			...(labelMeta ? [labelMeta] : []),
			...(urlMeta ? [urlMeta] : []),
			...(scaleMeta ? [scaleMeta] : []),
			viewport.next(),
		];

		return createComponentRenderable(schema.Mockup, {
			tag: 'div',
			properties: {
				device: deviceMeta,
				color: colorMeta,
				statusBar: statusBarMeta,
				...(labelMeta ? { label: labelMeta } : {}),
				...(urlMeta ? { url: urlMeta } : {}),
				...(scaleMeta ? { scale: scaleMeta } : {}),
			},
			refs: {
				viewport: viewport.tag('div'),
			},
			children: childNodes,
		});
	}
}

export const mockup = createSchema(MockupModel);
