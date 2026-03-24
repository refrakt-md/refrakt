import type { RuneConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';
import { isTag, makeTag, renderToHtml, readMeta } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Swatch: {
		block: 'swatch',
		defaultDensity: 'minimal',
		editHints: { chip: 'none', value: 'none' },
	},
	Palette: {
		block: 'palette',
		defaultDensity: 'full',
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
		modifiers: {
			title: { source: 'meta' },
		},
		contextModifiers: { 'design-context': 'in-design-context' },
		editHints: { title: 'none', section: 'none', scale: 'none', radii: 'none', shadows: 'none' },
	},
	DesignContext: {
		block: 'design-context',
		defaultDensity: 'full',
		modifiers: {
			title: { source: 'meta' },
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
		modifiers: {
			device: { source: 'meta', default: 'browser' },
			color: { source: 'meta', default: 'dark' },
			fit: { source: 'meta', default: 'auto', noBemClass: true },
		},
		editHints: { viewport: 'none' },
		postTransform(node) {
			const block = node.attributes.class?.split(' ')[0] || 'rf-mockup';
			const device = readMeta(node, 'device') || node.attributes['data-device'] || 'browser';
			const statusBar = readMeta(node, 'statusBar') !== 'false';
			const url = readMeta(node, 'url') || '';
			const label = readMeta(node, 'label') || '';
			const scale = readMeta(node, 'scale') || '';

			// Device categories
			const mobileDevices = ['iphone-15', 'iphone-se', 'pixel', 'phone'];
			const tabletDevices = ['ipad', 'tablet'];
			const isMobile = mobileDevices.includes(device);
			const isTablet = tabletDevices.includes(device);
			const isBrowser = device === 'browser' || device === 'browser-dark';
			const isMacbook = device === 'macbook';

			// Extract viewport and filter consumed meta tags
			let viewport: SerializedTag | null = null;
			const consumedMetas = ['status-bar', 'url', 'label', 'scale'];
			for (const child of node.children) {
				if (isTag(child) && child.attributes?.['data-name'] === 'viewport') {
					viewport = child;
				}
			}

			// Filter consumed meta tags
			const filtered = node.children.filter(child => {
				if (isTag(child) && child.attributes?.['data-name'] === 'viewport') return false;
				if (!isTag(child) || child.name !== 'meta') return true;
				return !consumedMetas.includes(child.attributes['data-field']);
			});

			// Fallback viewport
			if (!viewport) {
				viewport = makeTag('div', { 'data-name': 'viewport', class: `${block}__viewport` }, filtered);
			}

			// Build frame internals based on device type
			const frameChildren: RendererNode[] = [];

			if (isMobile || isTablet) {
				const bezelChildren: RendererNode[] = [];

				// Notch (mobile only)
				if (isMobile) {
					if (device === 'iphone-15') {
						bezelChildren.push(makeTag('div', { class: `${block}__notch ${block}__notch--dynamic-island` }, []));
					} else if (device === 'iphone-se') {
						bezelChildren.push(makeTag('div', { class: `${block}__notch ${block}__notch--classic` }, []));
					} else if (device === 'pixel') {
						bezelChildren.push(makeTag('div', { class: `${block}__notch ${block}__notch--punch-hole` }, []));
					}
				}

				// Status bar (mobile only)
				if (isMobile && statusBar) {
					bezelChildren.push(makeTag('div', { class: `${block}__status-bar` }, [
						makeTag('span', { class: `${block}__status-time` }, ['9:41']),
						makeTag('span', { class: `${block}__status-icons` }, []),
					]));
				}

				bezelChildren.push(viewport);

				// Home indicator (mobile only)
				if (isMobile) {
					bezelChildren.push(makeTag('div', { class: `${block}__home-indicator` }, []));
				}

				frameChildren.push(makeTag('div', { class: `${block}__bezel` }, bezelChildren));

			} else if (isBrowser || isMacbook) {
				// Title bar with traffic lights
				const titleBarChildren: RendererNode[] = [
					makeTag('div', { class: `${block}__traffic-lights` }, [
						makeTag('span', { class: `${block}__traffic-light ${block}__traffic-light--close` }, []),
						makeTag('span', { class: `${block}__traffic-light ${block}__traffic-light--minimize` }, []),
						makeTag('span', { class: `${block}__traffic-light ${block}__traffic-light--maximize` }, []),
					]),
				];

				// Address bar (browser only)
				if (isBrowser) {
					titleBarChildren.push(makeTag('div', { class: `${block}__address-bar` }, [
						...(url ? [makeTag('span', { class: `${block}__url` }, [url])] : []),
					]));
				}

				frameChildren.push(makeTag('div', { class: `${block}__title-bar` }, titleBarChildren));
				frameChildren.push(viewport);

				// Keyboard (macbook only)
				if (isMacbook) {
					frameChildren.push(makeTag('div', { class: `${block}__keyboard` }, [
						makeTag('div', { class: `${block}__trackpad` }, []),
					]));
				}

			} else if (node.attributes['data-device'] === 'watch') {
				const bezelChildren: RendererNode[] = [viewport];
				frameChildren.push(makeTag('div', { class: `${block}__bezel` }, bezelChildren));

			} else {
				// 'none' or fallback — just viewport
				frameChildren.push(viewport);
			}

			const children: RendererNode[] = [
				makeTag('div', { class: `${block}__frame` }, frameChildren),
			];

			// Label
			if (label) {
				children.push(makeTag('div', { class: `${block}__label` }, [label]));
			}

			// Scale as CSS custom property
			let style = node.attributes.style || '';
			if (scale && scale !== '1') {
				style = style ? `${style}; --mockup-scale: ${scale}` : `--mockup-scale: ${scale}`;
			}

			return {
				...node,
				attributes: {
					...node.attributes,
					...(style ? { style } : {}),
				},
				children,
			};
		},
	},
};
