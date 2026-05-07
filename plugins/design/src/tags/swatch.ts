import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable } from '@refrakt-md/runes';

const _swatch = createContentModelSchema({
	attributes: {
		color: { type: String, required: true, description: 'CSS color value displayed in the swatch chip (e.g. #ff5733, rgb(…)).' },
		label: { type: String, required: true, description: 'Display name shown beneath the color chip.' },
		showValue: { type: Boolean, required: false, description: 'Enable/disable showing the raw color value next to the label.' },
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

			return createComponentRenderable({ rune: 'swatch',
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

		return createComponentRenderable({ rune: 'swatch',
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
