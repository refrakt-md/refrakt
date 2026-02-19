import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class SwatchModel extends Model {
	@attribute({ type: String, required: true })
	color: string = '';

	@attribute({ type: String, required: true })
	label: string = '';

	@attribute({ type: Boolean, required: false })
	showValue: boolean = false;

	transform(): RenderableTreeNodes {
		const colorMeta = new Tag('meta', { content: this.color });
		const labelTag = new Tag('span', {}, [this.label]);
		const showValueMeta = new Tag('meta', { content: String(this.showValue) });

		const chip = new Tag('span', { style: `background-color: ${this.color}` }, []);
		const children: any[] = [colorMeta, showValueMeta, chip, labelTag];

		if (this.showValue) {
			const valueTag = new Tag('span', {}, [this.color]);
			children.push(valueTag);

			return createComponentRenderable(schema.Swatch, {
				tag: 'span',
				properties: {
					color: colorMeta,
					label: labelTag,
					showValue: showValueMeta,
				},
				refs: {
					chip,
					value: valueTag,
				},
				children,
			});
		}

		return createComponentRenderable(schema.Swatch, {
			tag: 'span',
			properties: {
				color: colorMeta,
				label: labelTag,
				showValue: showValueMeta,
			},
			refs: {
				chip,
				value: new Tag('span', {}, []),
			},
			children,
		});
	}
}

const _swatch = createSchema(SwatchModel);
export const swatch = { ..._swatch, selfClosing: true, inline: true };
