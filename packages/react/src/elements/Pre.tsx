import { createElement } from 'react';
import type { ReactNode } from 'react';
import type { SerializedTag } from '@refrakt-md/types';

interface PreProps {
	tag: SerializedTag;
	children: ReactNode;
}

/**
 * Pre element override — wraps code blocks in the rf-codeblock structure
 * that @refrakt-md/behaviors enhances with a copy button.
 */
export function Pre({ tag, children }: PreProps) {
	const isCodeBlock = 'data-language' in (tag.attributes || {});

	const attrs = filterAttrs(tag.attributes);

	if (isCodeBlock) {
		return createElement('div', { className: 'rf-codeblock' },
			createElement('pre', attrs, children),
		);
	}

	return createElement('pre', attrs, children);
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
