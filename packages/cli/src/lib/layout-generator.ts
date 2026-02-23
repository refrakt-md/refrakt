import type { SymbolDoc } from '../extractors/types.js';
import { toSlug } from './symbol-generator.js';

export interface LayoutOptions {
	/** Title for the nav section (default: "API Reference") */
	title?: string;
}

/** Generate a _layout.md with {% nav %} for API reference navigation */
export function generateLayoutMarkdown(
	symbols: SymbolDoc[],
	options?: LayoutOptions,
): string {
	const title = options?.title ?? 'API Reference';
	const lines: string[] = [];

	lines.push('{% layout %}');
	lines.push('{% region name="nav" %}');
	lines.push('{% nav %}');
	lines.push('');
	lines.push(`## ${title}`);
	lines.push('');

	for (const doc of symbols) {
		lines.push(`- ${toSlug(doc.name)}`);
	}

	lines.push('');
	lines.push('{% /nav %}');
	lines.push('{% /region %}');
	lines.push('{% /layout %}');
	lines.push('');

	return lines.join('\n');
}
