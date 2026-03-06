import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {useSchema} from '@refrakt-md/types';
import {attribute, Model, createComponentRenderable, createSchema} from '@refrakt-md/runes';

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

	@attribute({ type: String, required: false, matches: fitType.slice() })
	fit: typeof fitType[number] = 'auto';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const deviceMeta = new Tag('meta', { content: this.device });
		const colorMeta = new Tag('meta', { content: this.color });
		const statusBarMeta = new Tag('meta', { content: String(this.statusBar) });
		const labelMeta = this.label ? new Tag('meta', { content: this.label }) : undefined;
		const urlMeta = this.url ? new Tag('meta', { content: this.url }) : undefined;
		const scaleMeta = this.scale !== 1 ? new Tag('meta', { content: String(this.scale) }) : undefined;
		const fitMeta = this.fit !== 'auto' ? new Tag('meta', { content: this.fit }) : undefined;

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
	}
}

export const mockup = createSchema(MockupModel);
