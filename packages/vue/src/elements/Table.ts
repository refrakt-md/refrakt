import { defineComponent, h } from 'vue';
import type { SerializedTag } from '@refrakt-md/types';

/**
 * Table element override — wraps <table> in a scrollable container.
 */
export const Table = defineComponent({
	name: 'RfTable',
	props: {
		tag: { type: Object as () => SerializedTag, required: true },
	},
	setup(props, { slots }) {
		return () => h('div', { class: 'rf-table-wrapper' },
			h('table', filterAttrs(props.tag.attributes), slots.default?.()),
		);
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
