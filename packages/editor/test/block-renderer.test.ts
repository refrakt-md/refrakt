import { describe, it, expect } from 'vitest';
import { baseConfig } from '@refrakt-md/runes';
import type { AggregatedData } from '@refrakt-md/types';
import { renderBlockPreview } from '../app/src/lib/preview/block-renderer.js';

// BUG-032 — the preview's client-side stand-in for the design plugin's
// postProcess must read the sandbox's `context` from the `data-rune-fields`
// bag, the same channel the build reads.
const aggregated = {
	design: {
		entityByName: {
			default: { data: { colors: [{ name: 'Primary', value: '#2563EB' }] } },
			dark: { data: { colors: [{ name: 'Background', value: '#111827' }] } },
		},
	},
} as unknown as AggregatedData;

function render(source: string): string {
	return renderBlockPreview(source, baseConfig, null, undefined, undefined, aggregated).html;
}

describe('renderBlockPreview sandbox design tokens', () => {
	it('injects the named context token set', () => {
		const html = render('{% sandbox context="dark" %}\n<p>x</p>\n{% /sandbox %}');
		expect(html).toContain('#111827');
		expect(html).not.toContain('#2563EB');
	});

	it('injects the default set when no context is given', () => {
		const html = render('{% sandbox %}\n<p>x</p>\n{% /sandbox %}');
		expect(html).toContain('#2563EB');
	});

	it('injects nothing for an undefined context', () => {
		const html = render('{% sandbox context="missing" %}\n<p>x</p>\n{% /sandbox %}');
		expect(html).not.toContain('#2563EB');
		expect(html).not.toContain('#111827');
	});
});
