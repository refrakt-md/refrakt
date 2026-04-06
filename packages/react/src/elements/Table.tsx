import { createElement } from 'react';
import type { ReactNode } from 'react';
import type { SerializedTag } from '@refrakt-md/types';

interface TableProps {
	tag: SerializedTag;
	children: ReactNode;
}

/**
 * Table element override — wraps <table> in a scrollable container.
 */
export function Table({ tag, children }: TableProps) {
	return createElement('div', { className: 'rf-table-wrapper' },
		createElement('table', filterAttrs(tag.attributes), children),
	);
}

function filterAttrs(attrs: Record<string, any>): Record<string, any> {
	const result: Record<string, any> = {};
	for (const [k, v] of Object.entries(attrs)) {
		if (k === '$$mdtype' || v === undefined || v === null || v === false) continue;
		if (k === 'class') { result.className = v; continue; }
		result[k] = v === true ? '' : v;
	}
	return result;
}
