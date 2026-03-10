import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';
import { schema } from '../types.js';

const _swatch = createContentModelSchema({
	attributes: {
		color: { type: String, required: true },
		label: { type: String, required: true },
		showValue: { type: Boolean, required: false },
	},
	contentModel: {
		type: 'sequence',
		fields: [],
	},
	transform(_resolved, attrs) {
		const color = attrs.color ?? '';
		const label = attrs.label ?? '';
		const showValue = attrs.showValue ?? false;

		const colorMeta = new Tag('meta', { content: color });
		const labelTag = new Tag('span', {}, [label]);
		const showValueMeta = new Tag('meta', { content: String(showValue) });

		const chip = new Tag('span', { style: `background-color: ${color}` }, []);
		const children: any[] = [colorMeta, showValueMeta, chip, labelTag];

		if (showValue) {
			const valueTag = new Tag('span', {}, [color]);
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
	},
});

export const swatch = { ..._swatch, selfClosing: true, inline: true };
