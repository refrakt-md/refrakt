import type { RuneConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';
import { isTag, makeTag, renderToHtml, readMeta, readField } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Swatch: {
		block: 'swatch',
		defaultDensity: 'minimal',
		defaultElevation: 'flat',
		editHints: { chip: 'none', value: 'none' },
	},
	Palette: {
		block: 'palette',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { title: 'title' },
		modifiers: {
			title: { source: 'meta' },
			showContrast: { source: 'meta' },
			showA11y: { source: 'meta' },
			columns: { source: 'meta' },
		},
		contextModifiers: { 'design-context': 'in-design-context' },
		editHints: { 'group-title': 'none', 'swatch-color': 'none', 'swatch-name': 'none', 'swatch-value': 'none', grid: 'none', scale: 'none' },
	},
	Typography: {
		block: 'typography',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { title: 'title' },
		modifiers: {
			title: { source: 'meta' },
			showSizes: { source: 'meta' },
			showWeights: { source: 'meta' },
			showCharset: { source: 'meta' },
		},
		contextModifiers: { 'design-context': 'in-design-context' },
		editHints: { title: 'none', specimen: 'none', specimens: 'none', sizes: 'none', weights: 'none', charset: 'none' },
	},
	Spacing: {
		block: 'spacing',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { title: 'title' },
		modifiers: {
			title: { source: 'meta' },
		},
		contextModifiers: { 'design-context': 'in-design-context' },
		editHints: { title: 'none', section: 'none', scale: 'none', radii: 'none', shadows: 'none' },
	},
	DesignContext: {
		block: 'design-context',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sections: { title: 'title' },
		modifiers: {
			titleText: { source: 'meta' },
		},
		editHints: { title: 'none', sections: 'none' },
	},
	Preview: {
		block: 'preview',
		defaultDensity: 'compact',
		defaultWidth: 'wide',
		modifiers: {
			theme: { source: 'meta', default: 'auto' },
			responsive: { source: 'meta' },
			title: { source: 'meta' },
		},
		contextModifiers: { 'feature': 'in-feature' },
		editHints: { source: 'code' },
		postTransform(node) {
			// Generate themed HTML when source mode is active.
			// This must happen in postTransform (not the rune) because it needs
			// the fully-transformed tree with BEM classes and structural elements.
			const hasSource = node.children.some(
				c => isTag(c) && c.name === 'pre' && c.attributes['data-name'] === 'source'
			);
			if (!hasSource) return node;

			// Extract content children (skip meta, source, htmlSource, themedSource)
			const contentChildren = node.children.filter(c => {
				if (!isTag(c)) return true;
				if (c.name === 'meta' && c.attributes['data-field']) return false;
				if (c.name === 'pre' && c.attributes['data-name']) return false;
				return true;
			});

			const html = renderToHtml(contentChildren, { pretty: true });
			if (!html) return node;

			const themedPre = makeTag('pre', {
				'data-name': 'themed-source',
				'data-language': 'html',
			}, [
				makeTag('code', { 'data-language': 'html' }, [html]),
			]);

			return { ...node, children: [...node.children, themedPre] };
		},
	},
	Mockup: {
		block: 'mockup',
		defaultDensity: 'compact',
		defaultElevation: 'flush',
		mediaSlots: { viewport: 'hero' },
		modifiers: {
			device: { source: 'meta', default: 'browser' },
			color: { source: 'meta', default: 'dark' },
			fit: { source: 'meta', default: 'auto', noBemClass: true },
		},
		editHints: { viewport: 'none' },
	},
};
