import type { RuneConfig } from '@refrakt-md/transform';
import { isTag, makeTag, renderToHtml, readMeta } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Swatch: { block: 'swatch' },
	Palette: {
		block: 'palette',
		modifiers: {
			title: { source: 'meta' },
			showContrast: { source: 'meta' },
			showA11y: { source: 'meta' },
			columns: { source: 'meta' },
		},
		contextModifiers: { DesignContext: 'in-design-context' },
	},
	Typography: {
		block: 'typography',
		modifiers: {
			title: { source: 'meta' },
			showSizes: { source: 'meta' },
			showWeights: { source: 'meta' },
			showCharset: { source: 'meta' },
		},
		contextModifiers: { DesignContext: 'in-design-context' },
	},
	Spacing: {
		block: 'spacing',
		modifiers: {
			title: { source: 'meta' },
		},
		contextModifiers: { DesignContext: 'in-design-context' },
	},
	DesignContext: {
		block: 'design-context',
		modifiers: {
			title: { source: 'meta' },
		},
	},
	Preview: {
		block: 'preview',
		modifiers: {
			theme: { source: 'meta', default: 'auto' },
			width: { source: 'meta', default: 'wide' },
			responsive: { source: 'meta' },
			title: { source: 'meta' },
		},
		postTransform(node) {
			// Generate themed HTML when source mode is active.
			// This must happen in postTransform (not the rune) because it needs
			// the fully-transformed tree with BEM classes and structural elements.
			const hasSource = node.children.some(
				c => isTag(c) && c.name === 'pre' && c.attributes.property === 'source'
			);
			if (!hasSource) return node;

			// Extract content children (skip meta, source, htmlSource, themedSource)
			const contentChildren = node.children.filter(c => {
				if (!isTag(c)) return true;
				if (c.name === 'meta' && c.attributes.property) return false;
				if (c.name === 'pre' && c.attributes.property) return false;
				return true;
			});

			const html = renderToHtml(contentChildren, { pretty: true });
			if (!html) return node;

			const themedPre = makeTag('pre', {
				property: 'themedSource',
				'data-language': 'html',
			}, [
				makeTag('code', { 'data-language': 'html' }, [html]),
			]);

			return { ...node, children: [...node.children, themedPre] };
		},
	},
};
