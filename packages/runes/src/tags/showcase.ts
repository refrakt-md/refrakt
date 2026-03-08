import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const shadowValues = ['none', 'soft', 'hard', 'elevated'] as const;
const bleedValues = ['none', 'top', 'bottom', 'both', 'end', 'bottom-end', 'top-end'] as const;

class ShowcaseModel extends Model {
	@attribute({ type: String, required: false, matches: shadowValues.slice() })
	shadow: typeof shadowValues[number] = 'none';

	@attribute({ type: String, required: false, matches: bleedValues.slice() })
	bleed: typeof bleedValues[number] = 'none';

	@attribute({ type: String, required: false })
	offset: string = '';

	@attribute({ type: String, required: false })
	aspect: string = '';

	@attribute({ type: String, required: false, matches: [
		'left', 'center', 'right', 'top', 'bottom',
		'top left', 'top center', 'top right',
		'bottom left', 'bottom center', 'bottom right',
	] })
	place: string = '';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const properties: Record<string, any> = {};
		const childNodes: any[] = [];

		if (this.shadow && this.shadow !== 'none') {
			const meta = new Tag('meta', { content: this.shadow });
			properties.shadow = meta;
			childNodes.push(meta);
		}

		if (this.bleed && this.bleed !== 'none') {
			const meta = new Tag('meta', { content: this.bleed });
			properties.bleed = meta;
			childNodes.push(meta);
		}

		if (this.offset) {
			const meta = new Tag('meta', { content: this.offset });
			properties.offset = meta;
			childNodes.push(meta);
		}

		if (this.aspect) {
			const meta = new Tag('meta', { content: this.aspect });
			properties.aspect = meta;
			childNodes.push(meta);
		}

		if (this.place) {
			const meta = new Tag('meta', { content: this.place });
			properties.place = meta;
			childNodes.push(meta);
		}

		const viewport = new Tag('div', {}, children.toArray());

		childNodes.push(viewport);

		return createComponentRenderable(schema.Showcase, {
			tag: 'div',
			properties,
			refs: {
				viewport,
			},
			children: childNodes,
		});
	}
}

export const showcase = createSchema(ShowcaseModel);
