import { defineComponent, h } from 'vue';
import type { SerializedTag } from '@refrakt-md/types';

/**
 * Pre element override — wraps code blocks in the rf-codeblock structure
 * that @refrakt-md/behaviors enhances with a copy button.
 */
export const Pre = defineComponent({
	name: 'RfPre',
	props: {
		tag: { type: Object as () => SerializedTag, required: true },
	},
	setup(props, { slots }) {
		return () => {
			const isCodeBlock = 'data-language' in (props.tag.attributes || {});
			const attrs = filterAttrs(props.tag.attributes);

			if (isCodeBlock) {
				return h('div', { class: 'rf-codeblock' },
					h('pre', attrs, slots.default?.()),
				);
			}

			return h('pre', attrs, slots.default?.());
		};
	},
});

function filterAttrs(attrs: Record<string, any>): Record<string, any> {
	const result: Record<string, any> = {};
	for (const [k, v] of Object.entries(attrs)) {
		if (k === '$$mdtype' || v === undefined || v === null || v === false) continue;
		result[k] = v === true ? '' : v;
	}
	return result;
}
