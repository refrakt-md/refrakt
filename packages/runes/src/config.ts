import type { ThemeConfig, SerializedTag, RendererNode } from '@refrakt-md/transform';
import { isTag, makeTag, renderToHtml, findMeta, findByDataName, readMeta, readField, resolveGap, ratioToFr, resolveValign } from '@refrakt-md/transform';
import type { PluginPipelineHooks, TransformedPage, EntityRegistry, AggregatedData, PipelineContext } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createComponentRenderable } from './lib/index.js';
import { BREADCRUMB_AUTO_SENTINEL } from './tags/breadcrumb.js';
import { NAV_AUTO_SENTINEL, NAV_COLLAPSED_AUTO } from './tags/nav.js';
import { PAGINATION_AUTO_SENTINEL } from './tags/pagination.js';
import { XREF_RUNE_MARKER } from './tags/xref.js';
import { resolveXrefs } from './xref-resolve.js';
import type { CompiledXrefPattern } from './xref-patterns.js';
import { preprocessSnippets, wrapStandaloneSnippets } from './snippet-pipeline.js';
import { registerDrawers, resolveAutoDrawerTitleLevels, hoistPreviewDrawers } from './drawer-pipeline.js';
import { resolveFileRefs } from './file-ref-resolve.js';
import { resolveXrefPreviews } from './xref-preview-resolve.js';
import { applyOutlineScopeWalkers, harvestHeadingsFromRenderable } from './outline-scope.js';
import { resolveExpands } from './expand-pipeline.js';
import { resolveCollections } from './collection-resolve.js';
import { resolveRelationships } from './relationships-resolve.js';
import { resolveAggregates } from './aggregate-resolve.js';
import { resolveDataBindings } from './data-resolve.js';

/** Read text content from a property span child */
function readPropText(node: SerializedTag, prop: string): string {
	for (const c of node.children) {
		if (isTag(c) && c.attributes?.['data-field'] === prop.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase()) {
			return c.children.filter((ch): ch is string => typeof ch === 'string').join('');
		}
	}
	return '';
}

/** autoLabel entries shared by all PageSection-based runes */
const pageSectionAutoLabel = {
	header: 'preamble',   // <header> wrapper element → data-name="preamble"
	eyebrow: 'eyebrow',   // property="eyebrow"
	headline: 'headline', // property="headline"
	blurb: 'blurb',       // property="blurb"
	image: 'image',       // property="image"
};

/** Core theme configuration — universal rune-to-BEM-block mappings shared by all themes.
 *  Icons are empty; themes provide their own icon SVGs via mergeThemeConfig. */
export const coreConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		// ─── Simple runes (block name only, engine adds BEM classes) ───

		Accordion: { block: 'accordion', defaultDensity: 'full', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' } },
		AccordionItem: { block: 'accordion-item', parent: 'Accordion', requiresParent: 'Accordion', rootAttributes: { 'data-state': 'closed' }, autoLabel: { name: 'header' }, editHints: { header: 'inline', body: 'none' } },
		Details: { block: 'details', autoLabel: { summary: 'summary' }, editHints: { summary: 'inline', body: 'none' } },
		Grid: {
			block: 'grid',
			defaultDensity: 'full',
			childDensity: 'compact',
			modifiers: {
				mode: { source: 'meta', default: 'columns' },
				collapse: { source: 'meta', noBemClass: true },
				aspect: { source: 'meta', noBemClass: true },
				stack: { source: 'meta', noBemClass: true },
				ratio: { source: 'meta', noBemClass: true },
				valign: { source: 'meta', noBemClass: true },
				gap: { source: 'meta', noBemClass: true },
				min: { source: 'meta', noBemClass: true },
			},
			styles: {
				ratio: { prop: '--grid-ratio', transform: ratioToFr },
				valign: { prop: '--grid-valign', transform: resolveValign },
				gap: { prop: '--grid-gap', transform: resolveGap },
				min: '--grid-min',
				aspect: '--grid-aspect',
			},
			editHints: { cell: 'none' },
		},
		CodeGroup: {
			block: 'codegroup',
			interactive: true,
			defaultDensity: 'compact',
			modifiers: { title: { source: 'meta', noBemClass: true }, overflow: { source: 'meta', default: 'scroll' } },
			// The window chrome (three dots) is pure decoration — drawn in CSS
			// on `.rf-codegroup__topbar`. The only metadata is the optional
			// filename `title`, a bare monospace field in the topbar bar.
			// `renderWhenEmpty` lets `title=""` still project the topbar (window
			// chrome, no filename); an absent title renders no topbar.
			metaFields: {
				title: { metaType: 'code', condition: 'title', renderWhenEmpty: true },
			},
			blocks: {
				topbar: { fields: ['title'], layout: 'bar' },
			},
			layout: { root: ['topbar'] },
			sections: { topbar: 'header' },
			// Opt in to the highlight transform's `theme.code.colorScheme` cascade
			// (topbar + tab chrome flip with the inner code). Static flag → declared
			// via rootAttributes rather than a postTransform. The `data-code-host`
			// consumer reads it truthily, so `"true"` is equivalent to the old
			// valueless boolean.
			rootAttributes: { 'data-code-host': 'true' },
			editHints: { panel: 'code' },
		},
		PageSection: { block: 'page-section' },
		TableOfContents: { block: 'toc' },
		/* Snippet doesn't have a normal schema transform — its preprocess
		 * hook replaces the tag with a `fence` node, and the standalone
		 * wrap step adds `<figure class="rf-snippet">` post-transform.
		 * The engine never sees a `Snippet` tag, but we still need an
		 * entry in the theme config so `computeUsedCssBlocks` includes
		 * `snippet.css` in CSS tree-shaking when the figure is rendered. */
		Snippet: { block: 'snippet' },
		/* Expand emits a placeholder during transform; the postProcess hook
		 * substitutes the entity content wrapped in `<section
		 * class="rf-expand" data-rune="expand">`. Engine config provides the
		 * block name for CSS tree-shaking. */
		Expand: { block: 'expand' },
		/* Badge emits a complete `<span class="rf-badge" data-rune="badge">`
		 * directly from its schema and needs no engine post-processing, but
		 * still needs an entry in the theme config so `computeUsedCssBlocks`
		 * includes `badge.css` in CSS tree-shaking when a badge is rendered. */
		Badge: { block: 'badge' },
		/* SPEC-079 composable rune handles — render the same DOM as the
		 * engine's `split` / `definition-list` layout primitives. CSS comes
		 * from the universal `[data-zone-layout=…]` selectors; per-rune
		 * blocks exist so CSS tree-shaking includes them. */
		Bar: { block: 'bar' },
		Deflist: { block: 'deflist' },
		/* Collection emits a sentinel during transform; the postProcess hook
		 * (`resolveCollections`) fills it with queried entities. Engine config
		 * provides the block name for CSS tree-shaking. */
		Collection: { block: 'collection' },
		Relationships: { block: 'relationships' },
		/* file-ref emits a sentinel during transform; resolveFileRefs in
		 * the postProcess chain binds it to a GitHub URL anchor (and to
		 * a hoist sentinel for the drawer pipeline when preview="drawer").
		 * Engine config entry exists so the BEM block / data-rune are
		 * registered and CSS tree-shaking includes file-ref.css when
		 * authors use the rune. */
		FileRef: { block: 'file-ref' },
		/* Aggregate emits a sentinel during transform; the postProcess hook
		 * (`resolveAggregates`) fills it with either a single integer (no-body
		 * form) or a body-zoned breakdown. Engine config provides the block
		 * name for CSS tree-shaking. */
		Aggregate: { block: 'aggregate' },
		Progress: {
			block: 'progress',
			modifiers: { sentiment: { source: 'meta' } },
		},
		/* card — generic content card. The shared `media-position` modifier
		 * places the media zone above, below, or beside the content; `media-ratio`
		 * controls media's share of the row in beside layouts. Named parts
		 * (media/content/body/footer/link) get rf-card__* from data-name. */
		Card: {
			block: 'card',
			modifiers: {
				'media-position': { source: 'meta', default: 'top', noBemClass: true },
				'media-ratio': { source: 'meta', noBemClass: true },
				valign: { source: 'meta', noBemClass: true },
				collapse: { source: 'meta', noBemClass: true },
				// SPEC-089 — cover-mode overlay anchor + intrinsic height/aspect.
				'content-place': { source: 'meta', noBemClass: true },
				height: { source: 'meta', noBemClass: true },
				aspect: { source: 'meta', noBemClass: true },
			},
			sections: { media: 'media' },
			// SPEC-081/091: the transform emits flat slots; `layout` builds the
			// skeleton — media beside a `content` wrapper grouping eyebrow/body/
			// footer. A base `layout` is the prerequisite for the cover variant
			// ({% ref "SPEC-089" /%}).
			layout: {
				root: ['media', 'content'],
				content: { tag: 'div', children: ['eyebrow', 'body', 'footer'] },
			},
			// SPEC-089 — `media-position="cover"` is a config variant (full scope:
			// the media well fills the card interior and all content overlays it).
			variants: {
				'media-position': {
					cover: { staticModifiers: ['cover'], rootAttributes: { 'data-cover-scope': 'full' } },
				},
			},
			styles: {
				valign: { prop: '--split-valign', transform: resolveValign },
				aspect: 'aspect-ratio',
			},
		},
		Embed: {
			block: 'embed',
			defaultDensity: 'compact',
			// SPEC-081: the rune transform builds the wrapper/iframe/fallback
			// structure directly; `provider` is a bag-only modifier that surfaces
			// as `data-provider`. No postTransform.
			modifiers: {
				provider: { source: 'meta', default: 'generic', noBemClass: true },
			},
			editHints: { fallback: 'none' },
		},
		Breadcrumb: {
			block: 'breadcrumb',
			defaultDensity: 'minimal',
			editHints: { items: 'none' },
			modifiers: {
				separator: { source: 'meta', default: '/', noBemClass: true },
			},
			styles: {
				separator: { prop: '--separator', template: '"{}"' },
			},
		},
		BreadcrumbItem: { block: 'breadcrumb-item', parent: 'Breadcrumb', requiresParent: 'Breadcrumb' },
		Blog: {
			block: 'blog',
			defaultDensity: 'full',
			sections: { preamble: 'preamble', headline: 'title', blurb: 'description', content: 'body' },
			contentWrapper: { tag: 'div', ref: 'content' },
			modifiers: {
				layout: { source: 'meta', default: 'list' },
				sort: { source: 'meta', default: 'date-desc', noBemClass: true },
				filter: { source: 'meta', noBemClass: true },
				limit: { source: 'meta', noBemClass: true },
				folder: { source: 'meta', noBemClass: true },
			},
			autoLabel: pageSectionAutoLabel,
			editHints: { headline: 'inline', blurb: 'inline' },
		},
		Budget: {
			block: 'budget',
			defaultDensity: 'full',
			sections: { preamble: 'preamble', headline: 'title', footer: 'footer' },
			editHints: { headline: 'inline' },
			modifiers: {
				currency: { source: 'meta', default: 'USD' },
				duration: { source: 'meta' },
				showPerDay: { source: 'meta', default: 'true' },
				variant: { source: 'meta', default: 'detailed' },
			},
			// Duration reads first as a bare chip (self-evident, no label);
			// currency is pushed to the right edge where it reads naturally
			// against the budget breakdown below.
			metaFields: {
				duration: { metaType: 'category', condition: 'duration' },
				currency: { metaType: 'category', condition: 'currency' },
			},
			blocks: {
				meta: { fields: ['duration', { field: 'currency', align: 'end' }], layout: 'bar' },
			},
			// SPEC-081: the transform emits flat header slots and derives the
			// totals (footer + category headers built there); `layout` builds the
			// preamble <header>, and the categories / footer append after it.
			layout: {
				root: ['meta', 'preamble'],
				preamble: { tag: 'header', children: ['headline', 'blurb', 'image'] },
			},
		},
		BudgetCategory: {
			block: 'budget-category',
			parent: 'Budget',
			modifiers: {
				estimate: { source: 'meta', default: 'false' },
				label: { source: 'meta', noBemClass: true },
				subtotal: { source: 'meta', noBemClass: true },
			},
			editHints: { label: 'none', subtotal: 'none' },
		},
		BudgetLineItem: { block: 'budget-line-item', parent: 'Budget' },

		// ─── Runes with modifier meta tags ───

		Hint: {
			block: 'hint',
			defaultDensity: 'compact',
			modifiers: { hintType: { source: 'meta', default: 'note' } },
			contextModifiers: { 'hero': 'in-hero', 'feature': 'in-feature' },
			sections: { header: 'header' },
			// Header is a single `hintType` field, icon-decorated: the value
			// (note/warning/caution/check) selects both the glyph and the
			// label text.
			metaFields: {
				hintType: { icon: { group: 'hint' } },
			},
			blocks: {
				header: { fields: ['hintType'], layout: 'bar' },
			},
			layout: { root: ['header'] },
		},
		Drawer: {
			block: 'drawer',
			defaultDensity: 'compact',
			modifiers: {
				side: { source: 'meta', default: 'right' },
				size: { source: 'meta', default: 'md' },
				shortcut: { source: 'meta', noBemClass: true },
			},
			sections: { header: 'header', body: 'body', footer: 'footer' },
			editHints: { title: 'inline', body: 'none', close: 'none', footer: 'none' },
		},
		Figure: {
			block: 'figure',
			defaultDensity: 'compact',
			// SPEC-086 — a figure *is* a frame around its image, so `frame` chrome
			// targets the figure's own root (its body is the media).
			frameTarget: 'self',
			modifiers: {
				size: { source: 'meta', default: 'default' },
				align: { source: 'meta', default: 'center' },
			},
			sections: { caption: 'description' },
			editHints: { caption: 'inline' },
		},
		Gallery: {
			block: 'gallery',
			defaultDensity: 'full',
			childDensity: 'compact',
			modifiers: {
				layout: { source: 'meta', default: 'grid' },
				lightbox: { source: 'meta', default: 'true', noBemClass: true },
				columns: { source: 'meta', noBemClass: true },
			},
			styles: {
				columns: '--gallery-columns',
			},
			editHints: { items: 'none' },
		},
		Sidenote: {
			block: 'sidenote',
			defaultDensity: 'full',
			modifiers: { variant: { source: 'meta', default: 'sidenote' } },
			sections: { body: 'body' },
			editHints: { body: 'inline' },
		},
		Compare: {
			block: 'compare',
			defaultDensity: 'full',
			modifiers: { layout: { source: 'meta', default: 'side-by-side' } },
			editHints: { panels: 'none' },
		},
		Conversation: { block: 'conversation', defaultDensity: 'compact', editHints: { messages: 'none' } },
		ConversationMessage: {
			block: 'conversation-message',
			parent: 'Conversation',
			modifiers: { align: { source: 'meta', default: 'left' } },
			editHints: { body: 'inline' },
		},
		Annotate: {
			block: 'annotate',
			defaultDensity: 'full',
			modifiers: { variant: { source: 'meta', default: 'margin' } },
			sections: { body: 'body' },
			editHints: { body: 'none', notes: 'none' },
		},
		AnnotateNote: { block: 'annotate-note', parent: 'Annotate', editHints: { body: 'inline' } },
		Nav: {
			block: 'nav',
			defaultDensity: 'compact',
			modifiers: {
				layout: { source: 'attribute' },
			},
			postTransform(node) {
				return { ...node, name: 'rf-nav' };
			},
		},
		NavGroup: { block: 'nav-group', parent: 'Nav' },
		Pagination: {
			block: 'pagination',
			defaultDensity: 'compact',
			modifiers: {
				scope: { source: 'meta', default: 'siblings', noBemClass: true },
			},
		},
		NavItem: {
			block: 'nav-item',
			parent: 'Nav',
			postTransform(node) {
				// Extract slug from span[property="slug"] child → data-slug attribute
				// Keep slug text as visible fallback for SSR; web component replaces with <a> links
				let slug = '';
				const children = node.children.filter(child => {
					if (isTag(child) && child.name === 'span' && child.attributes['data-field'] === 'slug') {
						slug = child.children.filter((c): c is string => typeof c === 'string').join('');
						return false; // remove slug span from DOM
					}
					return true;
				});

				if (slug) {
					// Slug-based item: add slug text as visible fallback (replaced by web component at runtime)
					children.unshift(slug);
					return {
						...node,
						attributes: { ...node.attributes, 'data-slug': slug },
						children,
					};
				}

				// Explicit link item: add nav-item__link class to <a> tags for styling
				const styledChildren = children.map(child => {
					if (isTag(child) && child.name === 'a') {
						const existing = child.attributes.class || '';
						return { ...child, attributes: { ...child.attributes, class: ['rf-nav-item__link', existing].filter(Boolean).join(' ') } };
					}
					return child;
				});

				return { ...node, children: styledChildren };
			},
		},
		Diff: {
			block: 'diff',
			modifiers: { mode: { source: 'meta', default: 'unified' } },
			editHints: { line: 'none', 'gutter-num': 'none', 'gutter-prefix': 'none', 'line-content': 'none' },
		},
		Chart: {
			block: 'chart',
			defaultDensity: 'compact',
			// SPEC-083: the transform emits the rf-chart element wrapping the data
			// `<table>`; `type` / `stacked` are bag-only modifiers (→ data-type /
			// data-stacked) the web component reads. No postTransform.
			modifiers: {
				type: { source: 'meta', default: 'bar', noBemClass: true },
				stacked: { source: 'meta', noBemClass: true },
			},
			editHints: { data: 'none' },
		},

		// ─── Text formatting & layout runes ───

		PullQuote: {
			block: 'pullquote',
			defaultDensity: 'compact',
			modifiers: {
				align: { source: 'meta', default: 'center' },
				variant: { source: 'meta', default: 'default' },
			},
			sections: { body: 'body' },
			editHints: { body: 'inline' },
		},
		TextBlock: {
			block: 'textblock',
			defaultDensity: 'full',
			modifiers: {
				dropcap: { source: 'meta' },
				columns: { source: 'meta' },
				lead: { source: 'meta' },
				align: { source: 'meta', default: 'left' },
			},
			sections: { body: 'body' },
			editHints: { body: 'none' },
		},
		MediaText: {
			block: 'mediatext',
			defaultDensity: 'full',
			modifiers: {
				align: { source: 'meta', default: 'left' },
				ratio: { source: 'meta', default: '1:1' },
				wrap: { source: 'meta' },
			},
			sections: { body: 'body', media: 'media' },
			mediaSlots: { media: 'cover' },
			editHints: { media: 'image', body: 'none' },
		},

		Showcase: {
			block: 'showcase',
			defaultDensity: 'compact',
			childDensity: 'compact',
			sections: { viewport: 'body' },
			// SPEC-086 — showcase is the degenerate `frameTarget: 'self'` case: its
			// body *is* the media, so `frame` chrome lands on its own root. Its old
			// shadow/bleed/aspect/offset/place attributes are deprecated aliases for
			// `frame-*` facets (mapped + warned in showcase.ts); breakout (a
			// displaced guest spilling past a clipping ancestor) is its distinct
			// value, retained via the host-owned-clip CSS.
			frameTarget: 'self',
			contextModifiers: { 'bento-cell': 'in-bento-cell' },
			editHints: { viewport: 'none' },
		},

		// ─── Interactive runes (still get BEM classes, components add behavior) ───

		TabGroup: { block: 'tabs', interactive: true, defaultDensity: 'full', sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }, autoLabel: pageSectionAutoLabel, editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline' } },
		Tab: { block: 'tab', parent: 'TabGroup', requiresParent: 'TabGroup', rootAttributes: { 'data-state': 'inactive' }, editHints: { name: 'inline' } },
		TabPanel: { block: 'tab-panel', parent: 'TabGroup', requiresParent: 'TabGroup', rootAttributes: { 'data-state': 'inactive' } },
		DataTable: {
			block: 'datatable',
			interactive: true,
			defaultDensity: 'compact',
			sections: { table: 'body' },
			modifiers: {
				searchable: { source: 'meta', default: 'false' },
				sortable: { source: 'meta' },
				pageSize: { source: 'meta', default: '0' },
				defaultSort: { source: 'meta' },
			},
			editHints: { table: 'none' },
		},
		Form: {
			block: 'form',
			interactive: true,
			defaultDensity: 'full',
			sections: { body: 'body' },
			modifiers: {
				variant: { source: 'meta', default: 'stacked' },
				action: { source: 'meta' },
				method: { source: 'meta', default: 'POST' },
				success: { source: 'meta' },
				error: { source: 'meta' },
				honeypot: { source: 'meta', default: 'true' },
			},
			editHints: { body: 'none' },
		},
		FormField: {
			block: 'form-field',
			parent: 'Form',
			modifiers: {
				fieldType: { source: 'meta' },
			},
		},
		Reveal: {
			block: 'reveal',
			defaultDensity: 'full',
			modifiers: {
				mode: { source: 'meta', default: 'click' },
			},
			sections: { preamble: 'preamble', headline: 'title', blurb: 'description' },
			autoLabel: pageSectionAutoLabel,
			editHints: { headline: 'inline', eyebrow: 'inline', blurb: 'inline', steps: 'none' },
		},
		RevealStep: { block: 'reveal-step', parent: 'Reveal', rootAttributes: { 'data-state': 'closed' }, editHints: { body: 'none' } },
		Juxtapose: {
			block: 'juxtapose',
			interactive: true,
			defaultDensity: 'compact',
			modifiers: {
				variant: { source: 'meta', default: 'slider' },
				orientation: { source: 'meta', default: 'vertical', noBemClass: true },
				position: { source: 'meta', default: '50', noBemClass: true },
				duration: { source: 'meta', default: '1000', noBemClass: true },
			},
			styles: {
				position: '--jx-position',
				duration: '--jx-duration',
			},
			editHints: { panels: 'none' },
		},
		JuxtaposePanel: { block: 'juxtapose-panel', parent: 'Juxtapose', requiresParent: 'Juxtapose', rootAttributes: { 'data-state': 'inactive' }, editHints: { body: 'none' } },
		Diagram: {
			block: 'diagram',
			defaultDensity: 'compact',
			editHints: { source: 'code' },
			// SPEC-081: the rune transform emits the `rf-diagram` element + SSR
			// fallback; `language` is a bag-only modifier (→ data-language).
			modifiers: {
				language: { source: 'meta', default: 'mermaid', noBemClass: true },
			},
		},
		Tint: { block: 'tint', parent: '*' },
		Bg: { block: 'bg', parent: '*' },
		Region: { block: 'region', parent: 'Layout' },
		Sandbox: {
			block: 'sandbox',
			interactive: true,
			defaultDensity: 'compact',
			editHints: { source: 'code' },
		},
	},
};

/** @deprecated Use `coreConfig` instead. Alias kept for backwards compatibility during transition. */
export const baseConfig = coreConfig;

// ─── Cross-page pipeline helpers ───

/** Node in the page tree built from registered page entities */
export interface PageTreeNode {
	url: string;
	title: string;
	children: PageTreeNode[];
}

/** Build a page tree from a flat list of page entities */
function buildPageTree(
	pages: Array<{ url: string; title: string; parentUrl: string }>,
): PageTreeNode {
	const byUrl = new Map<string, PageTreeNode>();

	// Create nodes for all pages
	for (const p of pages) {
		byUrl.set(p.url, { url: p.url, title: p.title, children: [] });
	}

	const root: PageTreeNode = { url: '/', title: 'Root', children: [] };

	// Attach each page to its parent
	for (const p of pages) {
		const node = byUrl.get(p.url)!;
		if (p.url === '/') {
			// Root page merges into the virtual root
			root.title = p.title;
			root.children = node.children;
			byUrl.set('/', root);
		} else {
			const parent = byUrl.get(p.parentUrl) ?? root;
			parent.children.push(node);
		}
	}

	return root;
}

/** Build breadcrumb paths: url → ordered ancestor urls (root first, parent last) */
function buildBreadcrumbPaths(
	pages: Array<{ url: string; parentUrl: string }>,
): Map<string, string[]> {
	const parentOf = new Map<string, string>();
	for (const p of pages) {
		if (p.url !== '/') {
			parentOf.set(p.url, p.parentUrl);
		}
	}

	const paths = new Map<string, string[]>();
	for (const p of pages) {
		const ancestors: string[] = [];
		let current = parentOf.get(p.url);
		while (current !== undefined) {
			ancestors.unshift(current);
			current = parentOf.get(current);
		}
		paths.set(p.url, ancestors);
	}

	return paths;
}

/** Derive the parent url by stripping the last path segment */
function deriveParentUrl(url: string): string {
	if (url === '/' || !url.includes('/')) return '/';
	// '/docs/guide/' → strip trailing slash, then strip last segment
	const trimmed = url.endsWith('/') ? url.slice(0, -1) : url;
	const parent = trimmed.lastIndexOf('/');
	return parent <= 0 ? '/' : trimmed.slice(0, parent + 1);
}

/** Walk a Markdoc renderable tree, resolving any auto-breadcrumb placeholders */
function resolveAutoBreadcrumbs(
	renderable: unknown,
	pageUrl: string,
	breadcrumbPaths: Map<string, string[]>,
	pagesByUrl: Map<string, { url: string; title: string }>,
	ctx: PipelineContext,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveAutoBreadcrumbs(c, pageUrl, breadcrumbPaths, pagesByUrl, ctx)
			);
			// Return original if nothing changed
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	// Check if this is a Breadcrumb auto placeholder
	if (tag.attributes?.['data-rune'] === 'breadcrumb') {
		const hasSentinel = tag.children?.some(
			(c: any) => Tag.isTag(c) && c.attributes?.['data-field'] === BREADCRUMB_AUTO_SENTINEL
		);

		if (hasSentinel) {
			return buildAutoBreadcrumb(tag, pageUrl, breadcrumbPaths, pagesByUrl, ctx);
		}
	}

	// Recurse into children
	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveAutoBreadcrumbs(c, pageUrl, breadcrumbPaths, pagesByUrl, ctx)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

/** Build a resolved breadcrumb Tag from the page hierarchy */
function buildAutoBreadcrumb(
	originalTag: any,
	pageUrl: string,
	breadcrumbPaths: Map<string, string[]>,
	pagesByUrl: Map<string, { url: string; title: string }>,
	ctx: PipelineContext,
): unknown {
	const ancestorUrls = breadcrumbPaths.get(pageUrl);
	if (ancestorUrls === undefined) {
		ctx.warn(`Breadcrumb auto: page URL "${pageUrl}" not found in page registry`, pageUrl);
		return originalTag;
	}

	// Find separator from existing meta child
	const separatorMeta = originalTag.children?.find(
		(c: any) => Tag.isTag(c) && c.name === 'meta' && !c.attributes?.['data-field']
	);
	const separator = separatorMeta?.attributes?.content ?? '/';

	// Build breadcrumb items: ancestor pages + current page (no link)
	const listItems: any[] = [];

	for (const ancestorUrl of ancestorUrls) {
		const ancestorPage = pagesByUrl.get(ancestorUrl);
		if (!ancestorPage) continue;

		const nameSpan = new Tag('span', { hidden: true }, [ancestorPage.title]);
		const urlLink = new Tag('a', { href: ancestorUrl }, [ancestorPage.title]);

		listItems.push(
			createComponentRenderable({ rune: 'breadcrumb-item', schemaOrgType: 'ListItem',
				tag: 'li',
				properties: { name: nameSpan, url: urlLink },
				children: [nameSpan, urlLink],
			}) as any
		);
	}

	// Add current page as the last item (no link)
	const currentPage = pagesByUrl.get(pageUrl);
	const currentTitle = currentPage?.title ?? pageUrl;
	const currentSpan = new Tag('span', {}, [currentTitle]);
	listItems.push(
		createComponentRenderable({ rune: 'breadcrumb-item', schemaOrgType: 'ListItem',
			tag: 'li',
			properties: { name: currentSpan },
			children: [currentSpan],
		}) as any
	);

	const newSeparatorMeta = new Tag('meta', { content: separator });
	const itemsList = new Tag('ol', {}, listItems);

	return createComponentRenderable({ rune: 'breadcrumb', schemaOrgType: 'BreadcrumbList',
		tag: 'nav',
		properties: { separator: newSeparatorMeta },
		refs: { items: itemsList },
		children: [newSeparatorMeta, itemsList],
	});
}

/** Walk a Markdoc renderable tree, resolving any auto-nav placeholders */
function resolveAutoNavs(
	renderable: unknown,
	pageUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
	ctx: PipelineContext,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveAutoNavs(c, pageUrl, pagesByUrl, ctx)
			);
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	// Check if this is a Nav auto placeholder
	if (tag.attributes?.['data-rune'] === 'nav') {
		const hasSentinel = tag.children?.some(
			(c: any) => Tag.isTag(c) && c.attributes?.['data-field'] === NAV_AUTO_SENTINEL
		);

		if (hasSentinel) {
			return buildAutoNav(pageUrl, pagesByUrl, ctx, tag);
		}
	}

	// Recurse into children
	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveAutoNavs(c, pageUrl, pagesByUrl, ctx)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

/** Build a resolved nav Tag from the direct children of the current page.
 *  Preserves contextual attributes from the original sentinel-bearing nav
 *  (layout, data-auto, data-source-path) so downstream resolvers — including
 *  the cards/auto enrichment pass — see the same configuration the author
 *  declared. */
function buildAutoNav(
	pageUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
	ctx: PipelineContext,
	originalTag: any,
): unknown {
	// Find direct children: pages whose parentUrl is this page's URL (excluding self)
	const children = Array.from(pagesByUrl.values()).filter(
		p => p.parentUrl === pageUrl && p.url !== pageUrl,
	);

	if (children.length === 0) {
		ctx.warn(`Nav auto: page '${pageUrl}' has no registered child pages`, pageUrl);
	}

	const listItems: any[] = children.map(child => {
		const titleSpan = new Tag('span', { 'data-field': 'slug' }, [child.title]);
		const link = new Tag('a', { href: child.url }, [titleSpan]);

		return createComponentRenderable({ rune: 'nav-item',
			tag: 'li',
			properties: { slug: titleSpan },
			children: [link],
		});
	});

	const itemsList = new Tag('ul', {}, listItems);

	const newNav = createComponentRenderable({ rune: 'nav',
		tag: 'nav',
		properties: {
			group: [],
			item: listItems,
		},
		children: [itemsList],
	}) as any;

	// Preserve contextual attributes from the original nav so layout / auto /
	// source-path survive sentinel replacement.
	const carry = ['layout', 'data-layout', 'data-auto', 'data-source-path', 'data-collapsible', 'data-default-open'];
	for (const k of carry) {
		const v = originalTag?.attributes?.[k];
		if (v !== undefined) {
			newNav.attributes[k] = v;
		}
	}
	return newNav;
}

// ─── Nav slug resolution (SPEC-055) ───

/** Strip trailing slash, normalize index suffixes, lowercase. Used for URL
 *  comparison only — the canonical href written into the DOM keeps the
 *  page's original casing from the registry. */
function normaliseNavUrl(url: string): string {
	let u = url.trim();
	if (u.length > 1 && u.endsWith('/')) u = u.slice(0, -1);
	if (u.endsWith('/index')) u = u.slice(0, -'/index'.length) || '/';
	return u.toLowerCase();
}

/** Derive a nav's base URL directory from its source file path.
 *
 *  - `_layout.md`                       → `/`
 *  - `docs/_layout.md`                  → `/docs/`
 *  - `docs/themes/_layout.md`           → `/docs/themes/`
 *  - `docs/getting-started.md`          → `/docs/`
 *  - `docs/themes/configuration.md`     → `/docs/themes/`
 */
function deriveNavBaseDir(sourcePath: string): string {
	const parts = sourcePath.split('/').filter(Boolean);
	parts.pop(); // drop filename
	if (parts.length === 0) return '/';
	return '/' + parts.join('/') + '/';
}

function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;
	const prev = new Array(b.length + 1);
	const curr = new Array(b.length + 1);
	for (let j = 0; j <= b.length; j++) prev[j] = j;
	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
		}
		for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
	}
	return prev[b.length];
}

interface PageRef {
	url: string;
	title: string;
	parentUrl: string;
	description?: string;
	icon?: string;
}

/** Find up to 3 suggestion URLs for an unresolvable bare slug.
 *  Priority: (1) same final-segment pages outside base, (2) Levenshtein ≤ 2
 *  typo matches within base. */
function findNavSlugSuggestions(
	slug: string,
	baseDir: string,
	pagesByUrl: Map<string, PageRef>,
): string[] {
	const baseNorm = baseDir.endsWith('/') ? baseDir : baseDir + '/';
	const slugLower = slug.toLowerCase();
	const sameSlug: string[] = [];
	const typoMatches: { url: string; distance: number }[] = [];

	const expectedAtBase = (baseNorm + slug).replace(/\/+/g, '/').toLowerCase();
	for (const page of pagesByUrl.values()) {
		const url = page.url;
		const urlLower = url.toLowerCase();
		const tail = url.split('/').filter(Boolean).pop() ?? '';
		const tailLower = tail.toLowerCase();
		// Same-slug candidates: any page whose final segment equals the slug,
		// except the (missing) expected URL at base — those would have resolved
		// already, and a stale match would be misleading.
		if (tailLower === slugLower && urlLower !== expectedAtBase) {
			sameSlug.push(url);
			continue;
		}
		// Typo candidates: pages under base with a near-match final segment.
		if (urlLower.startsWith(baseNorm.toLowerCase())) {
			const d = levenshtein(slugLower, tailLower);
			if (d > 0 && d <= 2) typoMatches.push({ url, distance: d });
		}
	}

	sameSlug.sort();
	typoMatches.sort((a, b) => a.distance - b.distance || a.url.localeCompare(b.url));

	const suggestions = [...sameSlug, ...typoMatches.map(t => t.url)];
	return suggestions.slice(0, 3);
}

/** SPEC-055 nav-location-relative slug resolution.
 *
 *  Rules:
 *  - Slugs starting with `/`             → absolute path, passthrough
 *  - Slugs containing `/`                → multi-segment relative to baseDir
 *  - Bare slug                           → must resolve uniquely at baseDir
 *
 *  Returns the resolved canonical URL (from the registry, preserving case) or
 *  an error with attemptedUrl and suggestions. */
function resolveNavSlug(
	slug: string,
	baseDir: string,
	pagesByUrl: Map<string, PageRef>,
): { ok: true; url: string } | { ok: false; reason: 'not-found'; attemptedUrl: string; suggestions: string[] } {
	if (slug.startsWith('/')) {
		return { ok: true, url: slug };
	}

	const base = baseDir.endsWith('/') ? baseDir : baseDir + '/';
	const candidate = (base + slug).replace(/\/+/g, '/');
	const candidateNorm = normaliseNavUrl(candidate);

	// Look up by normalised URL — match against registry pages.
	for (const page of pagesByUrl.values()) {
		if (normaliseNavUrl(page.url) === candidateNorm) {
			return { ok: true, url: page.url };
		}
	}

	const suggestions = findNavSlugSuggestions(slug.includes('/') ? slug.split('/').pop()! : slug, base, pagesByUrl);
	return { ok: false, reason: 'not-found', attemptedUrl: candidate, suggestions };
}

// ─── Collapsible nav auto-open ───

function sharedPrefixLength(a: string, b: string): number {
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) i++;
	return i;
}

/** @deprecated Legacy global-search slug resolver, retained for backwards
 *  compatibility with auto-open / cards / pagination resolvers that haven't
 *  been migrated to use pre-resolved hrefs yet. SPEC-055's
 *  `resolveNavSlug` is the canonical resolver for new code. */
function resolveSlugToUrl(
	slug: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
	currentUrl: string,
): string | null {
	const candidates = Array.from(pagesByUrl.values()).filter(
		p => p.url.endsWith('/' + slug) || p.url === '/' + slug,
	);
	if (candidates.length === 0) return null;
	if (candidates.length === 1) return candidates[0].url;
	return candidates
		.slice()
		.sort((a, b) => sharedPrefixLength(b.url, currentUrl) - sharedPrefixLength(a.url, currentUrl))[0]
		.url;
}

/** Read a NavItem's slug from either `data-slug` (post-engine) or a nested
 *  `<span data-field="slug">` (pre-engine, e.g. layout regions). */
function readNavItemSlug(item: any): string | null {
	const direct = item.attributes?.['data-slug'];
	if (direct) return String(direct);
	const findSpan = (node: unknown): string | null => {
		if (!Tag.isTag(node as any)) {
			if (Array.isArray(node)) {
				for (const c of node) {
					const f = findSpan(c);
					if (f) return f;
				}
			}
			return null;
		}
		const t = node as any;
		if (t.name === 'span' && t.attributes?.['data-field'] === 'slug') {
			const parts: string[] = [];
			for (const c of t.children ?? []) {
				if (typeof c === 'string') parts.push(c);
			}
			return parts.join('').trim() || null;
		}
		for (const c of t.children ?? []) {
			const f = findSpan(c);
			if (f) return f;
		}
		return null;
	};
	return findSpan(item);
}

/** Collect URLs covered by a NavGroup's items: explicit hrefs + resolved slugs. */
function collectGroupItemUrls(
	group: any,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
	currentUrl: string,
): string[] {
	const urls: string[] = [];
	const walk = (node: unknown): void => {
		if (!Tag.isTag(node as any)) {
			if (Array.isArray(node)) node.forEach(walk);
			return;
		}
		const t = node as any;
		if (t.attributes?.['data-rune'] === 'nav-item') {
			const href = findNavItemHref(t);
			if (href) {
				urls.push(href);
			} else {
				const slug = readNavItemSlug(t);
				if (slug) {
					const resolved = resolveSlugToUrl(slug, pagesByUrl, currentUrl);
					if (resolved) urls.push(resolved);
				}
			}
		}
		(t.children ?? []).forEach(walk);
	};
	(group.children ?? []).forEach(walk);
	return urls;
}

function extractGroupTitle(group: any): string {
	const findText = (node: unknown): string | null => {
		if (typeof node === 'string') return node;
		if (!Tag.isTag(node as any)) {
			if (Array.isArray(node)) {
				for (const c of node) {
					const found = findText(c);
					if (found) return found;
				}
			}
			return null;
		}
		const t = node as any;
		if (t.attributes?.['data-field'] === 'title') {
			const parts: string[] = [];
			for (const c of t.children ?? []) {
				if (typeof c === 'string') parts.push(c);
			}
			if (parts.length > 0) return parts.join('').trim();
		}
		for (const c of t.children ?? []) {
			const found = findText(c);
			if (found) return found;
		}
		return null;
	};
	return findText(group) ?? '';
}

function urlMatchesGroup(currentUrl: string, itemUrls: string[]): boolean {
	for (const url of itemUrls) {
		if (!url) continue;
		if (currentUrl === url) return true;
		const prefix = url.endsWith('/') ? url : url + '/';
		if (currentUrl.startsWith(prefix)) return true;
	}
	return false;
}

/** Walk a renderable tree, resolving data-collapsed="auto" on NavGroup tags
 *  inside collapsible Nav containers. */
function resolveCollapsibleNavs(
	renderable: unknown,
	pageUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveCollapsibleNavs(c, pageUrl, pagesByUrl)
			);
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	if (
		tag.attributes?.['data-rune'] === 'nav' &&
		tag.attributes?.['data-collapsible'] === 'true'
	) {
		const defaultOpenRaw = String(tag.attributes?.['data-default-open'] ?? '');
		const defaultOpen = defaultOpenRaw
			? defaultOpenRaw.split(',').map(s => s.trim()).filter(Boolean)
			: [];

		const groups: any[] = [];
		const findGroups = (node: unknown): void => {
			if (!Tag.isTag(node as any)) return;
			const t = node as any;
			if (t.attributes?.['data-rune'] === 'nav-group') {
				groups.push(t);
			}
			(t.children ?? []).forEach(findGroups);
		};
		(tag.children ?? []).forEach(findGroups);

		for (const group of groups) {
			if (group.attributes?.['data-collapsed'] !== NAV_COLLAPSED_AUTO) continue;
			const title = extractGroupTitle(group);
			const inDefault = title && defaultOpen.includes(title);
			const itemUrls = collectGroupItemUrls(group, pagesByUrl, pageUrl);
			const matches = urlMatchesGroup(pageUrl, itemUrls);
			group.attributes['data-collapsed'] = (inDefault || matches) ? 'false' : 'true';
		}

		const newChildren = (tag.children ?? []).map((c: unknown) =>
			resolveCollapsibleNavs(c, pageUrl, pagesByUrl)
		);
		if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
		return { ...tag, children: newChildren };
	}

	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveCollapsibleNavs(c, pageUrl, pagesByUrl)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

// ─── Cards layout enrichment ───

interface PageMetadata {
	url: string;
	title: string;
	description?: string;
	icon?: string;
}

function enrichNavItemAsCard(
	item: any,
	pageMeta: PageMetadata | null,
	itemUrl: string | null,
): any {
	const titleText = pageMeta?.title ?? itemUrl ?? '';
	const description = pageMeta?.description;
	const icon = pageMeta?.icon;
	const href = pageMeta?.url ?? itemUrl ?? '';

	const linkChildren: any[] = [];
	if (icon) {
		linkChildren.push(
			new Tag('rf-icon', { name: icon, 'data-name': 'icon', class: 'rf-nav-item__icon' }, []),
		);
	}
	linkChildren.push(
		new Tag('span', { 'data-name': 'title', class: 'rf-nav-item__title' }, [titleText]),
	);
	if (description) {
		linkChildren.push(
			new Tag('span', { 'data-name': 'description', class: 'rf-nav-item__description' }, [description]),
		);
	}

	const link = href
		? new Tag('a', { href, class: 'rf-nav-item__link' }, linkChildren)
		: new Tag('span', { class: 'rf-nav-item__link' }, linkChildren);

	return { ...item, children: [link] };
}

function findNavItemHref(item: any): string | null {
	const walk = (node: unknown): string | null => {
		if (!Tag.isTag(node as any)) {
			if (Array.isArray(node)) {
				for (const c of node) {
					const found = walk(c);
					if (found) return found;
				}
			}
			return null;
		}
		const t = node as any;
		if (t.name === 'a' && t.attributes?.href) return String(t.attributes.href);
		for (const c of t.children ?? []) {
			const found = walk(c);
			if (found) return found;
		}
		return null;
	};
	return walk(item);
}

function getNavItemUrl(
	item: any,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string; description?: string; icon?: string }>,
	currentUrl: string,
): { url: string; isExternal: boolean } | null {
	// Prefer an explicit <a href> — covers `[Label](/url)` items whose link text
	// is wrapped in a slug span by the nav item transform.
	const href = findNavItemHref(item);
	if (href) {
		const isExternal = /^[a-z]+:\/\//i.test(href);
		return { url: href, isExternal };
	}
	const slug = readNavItemSlug(item);
	if (slug) {
		const resolved = resolveSlugToUrl(slug, pagesByUrl, currentUrl);
		return resolved ? { url: resolved, isExternal: false } : null;
	}
	return null;
}

/** Attach an icon (prepended) and a description (appended) inside a nav item's
 *  existing `<a>` link, drawn from the page's frontmatter. Used for the
 *  layout-agnostic `auto=true` enrichment (SPEC-054). Unlike the cards
 *  full-replacement, this preserves any inline author content (badges,
 *  custom link text) and just augments the link. Idempotent — re-runs do
 *  nothing because the same data-name children would already be present. */
function augmentNavItemFromFrontmatter(item: any, pageMeta: PageMetadata): any {
	const newChildren = (item.children ?? []).map((c: unknown) => {
		if (!Tag.isTag(c as any)) return c;
		const t = c as any;
		if (t.name !== 'a') return c;
		// Skip if this <a> has already been enriched (idempotency).
		const hasIcon = (t.children ?? []).some((x: any) =>
			Tag.isTag(x) && x.attributes?.['data-name'] === 'icon');
		const hasDescription = (t.children ?? []).some((x: any) =>
			Tag.isTag(x) && x.attributes?.['data-name'] === 'description');

		const newLinkChildren: any[] = [...(t.children ?? [])];
		if (pageMeta.icon && !hasIcon) {
			newLinkChildren.unshift(
				new Tag('rf-icon', { name: pageMeta.icon, 'data-name': 'icon', class: 'rf-nav-item__icon' }, []),
			);
		}
		if (pageMeta.description && !hasDescription) {
			newLinkChildren.push(
				new Tag('span', { 'data-name': 'description', class: 'rf-nav-item__description' }, [pageMeta.description]),
			);
		}
		return { ...t, children: newLinkChildren };
	});
	return { ...item, children: newChildren };
}

function resolveCardsNavs(
	renderable: unknown,
	pageUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string; description?: string; icon?: string }>,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveCardsNavs(c, pageUrl, pagesByUrl)
			);
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	if (tag.attributes?.['data-rune'] === 'nav') {
		const layout = tag.attributes?.['data-layout'] ?? tag.attributes?.['layout'];
		const isCards = layout === 'cards';
		const isAuto = tag.attributes?.['data-auto'] === 'true';

		// Cards layout: full replacement (icon + title + description inside the link).
		// Any other layout with auto=true: augment existing links with frontmatter
		// (icon prepended, description appended). Layouts without either: no enrichment.
		if (isCards || isAuto) {
			const enrichItem = (node: unknown): unknown => {
				if (!Tag.isTag(node as any)) {
					if (Array.isArray(node)) return node.map(enrichItem);
					return node;
				}
				const t = node as any;
				if (t.attributes?.['data-rune'] === 'nav-item') {
					const ref = getNavItemUrl(t, pagesByUrl, pageUrl);
					if (!ref) return t;
					if (isCards) {
						if (ref.isExternal) return enrichNavItemAsCard(t, null, ref.url);
						const page = pagesByUrl.get(ref.url);
						const meta: PageMetadata | null = page
							? { url: page.url, title: page.title, description: page.description, icon: page.icon }
							: null;
						return enrichNavItemAsCard(t, meta, ref.url);
					}
					// Auto-augment for non-cards layouts. External links don't have
					// frontmatter to enrich from — leave untouched.
					if (ref.isExternal) return t;
					const page = pagesByUrl.get(ref.url);
					if (!page) return t;
					const meta: PageMetadata = {
						url: page.url,
						title: page.title,
						description: page.description,
						icon: page.icon,
					};
					return augmentNavItemFromFrontmatter(t, meta);
				}
				const newChildren = (t.children ?? []).map(enrichItem);
				if (newChildren.every((c: unknown, i: number) => c === t.children[i])) return t;
				return { ...t, children: newChildren };
			};
			const newChildren = (tag.children ?? []).map(enrichItem);
			return { ...tag, children: newChildren };
		}
	}

	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveCardsNavs(c, pageUrl, pagesByUrl)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

// ─── Build-time nav slug resolution + active state (SPEC-055) ───

function isExternalUrl(url: string): boolean {
	return /^[a-z]+:\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('//');
}

/** Format a nav resolution error for ctx.error. Includes the source file,
 *  attempted URL, and closest-match suggestions. */
function formatNavResolutionError(
	slug: string,
	sourcePath: string | undefined,
	attemptedUrl: string,
	suggestions: string[],
): string {
	const where = sourcePath ? ` in ${sourcePath}` : '';
	const head = `Nav item \`${slug}\`${where} cannot be resolved (no page at \`${attemptedUrl}\`).`;
	if (suggestions.length === 0) return head;
	const lines = ['', 'Did you mean one of:', ...suggestions.map(s => `  - ${s}`), '', 'Use a multi-segment slug (e.g. `section/page`) or an explicit `[Label](/path)` link.'];
	return head + '\n' + lines.join('\n');
}

/** Walk a nav subtree, resolve every NavItem's `data-slug` to a real `<a href>`
 *  using SPEC-055 rules. Items with explicit `<a>` link children pass through
 *  unchanged. Unresolvable slugs emit a ctx.error and leave the item as
 *  fallback text so the build can continue and surface every error. */
function resolveNavItemsInSubtree(
	navTag: any,
	pagesByUrl: Map<string, PageRef>,
	ctx: PipelineContext,
	pageUrl: string,
): any {
	const sourcePath = navTag.attributes?.['data-source-path'] as string | undefined;
	const baseDir = deriveNavBaseDir(sourcePath ?? '');

	const visit = (node: unknown): unknown => {
		if (!Tag.isTag(node as any)) {
			if (Array.isArray(node)) {
				const next = node.map(visit);
				return next.every((c, i) => c === (node as unknown[])[i]) ? node : next;
			}
			return node;
		}
		const t = node as any;
		if (t.attributes?.['data-rune'] === 'nav-item') {
			// Skip items that already carry an explicit <a> link (passthrough).
			const existingHref = findNavItemHref(t);
			if (existingHref) return t;

			const slug = readNavItemSlug(t);
			if (!slug) return t;

			const result = resolveNavSlug(slug, baseDir, pagesByUrl);
			if (!result.ok) {
				ctx.error(
					formatNavResolutionError(slug, sourcePath, result.attemptedUrl, result.suggestions),
					pageUrl,
				);
				return t;
			}

			const page = pagesByUrl.get(result.url);
			const title = page?.title ?? slug;
			// The engine's NavItem.postTransform adds the `rf-nav-item__link` class to
			// any `<a>` child of a nav-item that has no slug span — so we deliberately
			// omit the class here to avoid duplication.
			const link = new Tag('a', { href: result.url }, [title]);

			// Replace the slug span + fallback text with the resolved link.
			const newChildren = (t.children ?? []).filter((c: unknown) => {
				if (typeof c === 'string') return false; // drop slug fallback text
				if (Tag.isTag(c as any)) {
					const ct = c as any;
					if (ct.name === 'span' && ct.attributes?.['data-field'] === 'slug') return false;
				}
				return true;
			});
			return { ...t, children: [link, ...newChildren] };
		}
		const newChildren = (t.children ?? []).map(visit);
		if (newChildren.every((c: unknown, i: number) => c === t.children[i])) return t;
		return { ...t, children: newChildren };
	};

	return visit(navTag);
}

/** Walk a renderable tree and resolve nav slugs in every `<rf-nav>` /
 *  `<nav data-rune="nav">` encountered. */
function resolveNavSlugs(
	renderable: unknown,
	pagesByUrl: Map<string, PageRef>,
	ctx: PipelineContext,
	pageUrl: string,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const next = (renderable as unknown[]).map(c => resolveNavSlugs(c, pagesByUrl, ctx, pageUrl));
			return next.every((c, i) => c === (renderable as unknown[])[i]) ? renderable : next;
		}
		return renderable;
	}
	const tag = renderable as any;
	if (tag.attributes?.['data-rune'] === 'nav') {
		return resolveNavItemsInSubtree(tag, pagesByUrl, ctx, pageUrl);
	}
	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveNavSlugs(c, pagesByUrl, ctx, pageUrl)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

/** Apply active-state attributes (`aria-current="page"`, `data-active="ancestor"`)
 *  to each nav's items, per SPEC-055. At most one item per nav gets aria-current
 *  (exact URL match); at most one of the remaining items gets data-active
 *  (longest strict-prefix match). */
function applyNavActiveState(renderable: unknown, pageUrl: string): unknown {
	const pageNorm = normaliseNavUrl(pageUrl);

	const markNav = (navTag: any): any => {
		// Collect all nav-item <a> links inside this nav.
		const links: { tag: any; href: string }[] = [];
		const collect = (node: unknown): void => {
			if (!Tag.isTag(node as any)) {
				if (Array.isArray(node)) node.forEach(collect);
				return;
			}
			const t = node as any;
			if (t.name === 'a' && typeof t.attributes?.href === 'string') {
				const href = String(t.attributes.href);
				if (!isExternalUrl(href)) {
					links.push({ tag: t, href });
				}
			}
			(t.children ?? []).forEach(collect);
		};
		(navTag.children ?? []).forEach(collect);

		// Pass 1: exact match → aria-current="page". At most one.
		let currentLink: any = null;
		for (const { tag, href } of links) {
			if (normaliseNavUrl(href) === pageNorm) {
				currentLink = tag;
				break;
			}
		}

		// Pass 2: longest strict prefix among the remaining links → data-active="ancestor".
		let ancestorLink: any = null;
		let ancestorHrefLen = 0;
		for (const { tag, href } of links) {
			if (tag === currentLink) continue;
			const hrefNorm = normaliseNavUrl(href);
			if (hrefNorm === '/' && pageNorm === '/') continue;
			// Strict prefix: hrefNorm is a proper prefix of pageNorm followed by '/'.
			const isPrefix =
				hrefNorm !== pageNorm &&
				(pageNorm.startsWith(hrefNorm + '/') || (hrefNorm === '/' && pageNorm.startsWith('/')));
			if (isPrefix && hrefNorm.length > ancestorHrefLen) {
				ancestorLink = tag;
				ancestorHrefLen = hrefNorm.length;
			}
		}

		// Mutate attributes in place — the link tags are nested within the navTag,
		// so mutation propagates without rebuilding the whole tree.
		if (currentLink) currentLink.attributes['aria-current'] = 'page';
		if (ancestorLink) ancestorLink.attributes['data-active'] = 'ancestor';

		return navTag;
	};

	const visit = (node: unknown): unknown => {
		if (!Tag.isTag(node as any)) {
			if (Array.isArray(node)) {
				node.forEach(visit);
			}
			return node;
		}
		const t = node as any;
		if (t.attributes?.['data-rune'] === 'nav') {
			markNav(t);
			// Don't recurse into a nav we just processed — nested navs are unusual
			// but if present, would be marked by their own pass.
			return t;
		}
		(t.children ?? []).forEach(visit);
		return t;
	};

	visit(renderable);
	return renderable;
}

// ─── Pagination auto resolution ───

interface SiblingEntry {
	url: string;
	title: string;
}

/** Walk a renderable tree collecting all nav-rune tags and their item URLs in order.
 *  Skips navs with non-sequential layouts (menubar / columns / cards) — those
 *  aren't reading sequences. */
function collectNavSequences(
	renderable: unknown,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
	currentUrl: string,
): string[][] {
	const sequences: string[][] = [];
	const walk = (node: unknown): void => {
		if (!Tag.isTag(node as any)) {
			if (Array.isArray(node)) node.forEach(walk);
			return;
		}
		const t = node as any;
		if (t.attributes?.['data-rune'] === 'nav') {
			const layout = t.attributes?.['layout'] ?? t.attributes?.['data-layout'];
			if (layout && layout !== 'vertical') {
				// Non-sequential layouts (menubar / columns / cards) — skip but recurse
				(t.children ?? []).forEach(walk);
				return;
			}
			// Each NavGroup is its own reading sequence. Top-level items (before
			// the first group) are cross-section links and not a reading order,
			// so we don't include them in any sequence.
			const groups: any[] = [];
			const findGroupsLocal = (n: unknown): void => {
				if (!Tag.isTag(n as any)) {
					if (Array.isArray(n)) n.forEach(findGroupsLocal);
					return;
				}
				const node = n as any;
				if (node.attributes?.['data-rune'] === 'nav-group') {
					groups.push(node);
				}
				(node.children ?? []).forEach(findGroupsLocal);
			};
			(t.children ?? []).forEach(findGroupsLocal);

			if (groups.length === 0) {
				// Flat nav (no headings) — collect all items as one sequence
				const items: string[] = [];
				const collectFlat = (n: unknown): void => {
					if (!Tag.isTag(n as any)) {
						if (Array.isArray(n)) n.forEach(collectFlat);
						return;
					}
					const node = n as any;
					if (node.attributes?.['data-rune'] === 'nav-item') {
						const href = findNavItemHref(node);
						if (href) {
							if (!/^[a-z]+:\/\//i.test(href)) items.push(href);
						} else {
							const slug = readNavItemSlug(node);
							if (slug) {
								const resolved = resolveSlugToUrl(slug, pagesByUrl, currentUrl);
								if (resolved) items.push(resolved);
							}
						}
					}
					(node.children ?? []).forEach(collectFlat);
				};
				(t.children ?? []).forEach(collectFlat);
				if (items.length > 0) sequences.push(items);
			} else {
				for (const group of groups) {
					const items: string[] = [];
					const collectGroup = (n: unknown): void => {
						if (!Tag.isTag(n as any)) {
							if (Array.isArray(n)) n.forEach(collectGroup);
							return;
						}
						const node = n as any;
						if (node.attributes?.['data-rune'] === 'nav-item') {
							const href = findNavItemHref(node);
							if (href) {
								if (!/^[a-z]+:\/\//i.test(href)) items.push(href);
							} else {
								const slug = readNavItemSlug(node);
								if (slug) {
									const resolved = resolveSlugToUrl(slug, pagesByUrl, currentUrl);
									if (resolved) items.push(resolved);
								}
							}
						}
						(node.children ?? []).forEach(collectGroup);
					};
					(group.children ?? []).forEach(collectGroup);
					if (items.length > 0) sequences.push(items);
				}
			}
		}
		(t.children ?? []).forEach(walk);
	};
	walk(renderable);
	return sequences;
}

/** Get siblings: pages sharing the same parentUrl, optionally widened to the whole section. */
function getSiblingPages(
	currentUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string; order?: number }>,
	scope: 'siblings' | 'section',
): SiblingEntry[] {
	const current = pagesByUrl.get(currentUrl);
	if (!current) return [];

	const pages = Array.from(pagesByUrl.values());
	let candidates: typeof pages;

	if (scope === 'section') {
		// Find the top-level section URL: walk up from current to a page whose parent is '/' or itself.
		let sectionRoot = currentUrl;
		let cursor: typeof current | undefined = current;
		while (cursor && cursor.parentUrl && cursor.parentUrl !== '/') {
			const parent = pagesByUrl.get(cursor.parentUrl);
			if (!parent) break;
			sectionRoot = parent.url;
			cursor = parent;
		}
		const prefix = sectionRoot.endsWith('/') ? sectionRoot : sectionRoot + '/';
		candidates = pages.filter(
			p => p.url === sectionRoot || p.url.startsWith(prefix),
		);
	} else {
		candidates = pages.filter(p => p.parentUrl === current.parentUrl);
	}

	// Sort by frontmatter order (asc, missing → end), tie-break by URL.
	candidates.sort((a, b) => {
		const ao = a.order ?? Number.POSITIVE_INFINITY;
		const bo = b.order ?? Number.POSITIVE_INFINITY;
		if (ao !== bo) return ao - bo;
		return a.url.localeCompare(b.url);
	});

	return candidates.map(p => ({ url: p.url, title: p.title }));
}

function pickPrevNextFromSequence(
	sequence: string[],
	currentUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>,
): { prev: SiblingEntry | null; next: SiblingEntry | null } {
	const idx = sequence.indexOf(currentUrl);
	if (idx === -1) return { prev: null, next: null };
	const prevUrl = idx > 0 ? sequence[idx - 1] : null;
	const nextUrl = idx < sequence.length - 1 ? sequence[idx + 1] : null;
	const lookup = (u: string | null): SiblingEntry | null => {
		if (!u) return null;
		const page = pagesByUrl.get(u);
		return page ? { url: page.url, title: page.title } : { url: u, title: u };
	};
	return { prev: lookup(prevUrl), next: lookup(nextUrl) };
}

function buildPaginationLink(
	target: SiblingEntry,
	direction: 'prev' | 'next',
	label?: string,
): any {
	const marker = direction === 'prev' ? '←' : '→';
	const linkText = label ?? target.title;
	const linkChildren = direction === 'prev'
		? [
			new Tag('span', { 'data-name': 'marker' }, [marker]),
			new Tag('span', { 'data-name': 'label' }, [linkText]),
		]
		: [
			new Tag('span', { 'data-name': 'label' }, [linkText]),
			new Tag('span', { 'data-name': 'marker' }, [marker]),
		];
	return new Tag(
		'a',
		{
			href: target.url,
			'data-direction': direction,
			'data-name': direction,
		},
		linkChildren,
	);
}

function resolveAutoPagination(
	renderable: unknown,
	pageUrl: string,
	pagesByUrl: Map<string, { url: string; title: string; parentUrl: string; description?: string; icon?: string; order?: number }>,
	rootRenderable: unknown,
): unknown {
	if (!Tag.isTag(renderable as any)) {
		if (Array.isArray(renderable)) {
			const newChildren = (renderable as unknown[]).map(c =>
				resolveAutoPagination(c, pageUrl, pagesByUrl, rootRenderable)
			);
			if (newChildren.every((c, i) => c === (renderable as unknown[])[i])) return renderable;
			return newChildren;
		}
		return renderable;
	}

	const tag = renderable as any;

	if (tag.attributes?.['data-rune'] === 'pagination') {
		const hasSentinel = (tag.children ?? []).some(
			(c: any) => Tag.isTag(c) && c.attributes?.['data-field'] === PAGINATION_AUTO_SENTINEL,
		);
		if (hasSentinel) {
			const scopeMeta = (tag.children ?? []).find(
				(c: any) => Tag.isTag(c) && c.attributes?.['data-field'] === 'scope',
			);
			const scopeValue = scopeMeta
				? String((scopeMeta as any).attributes?.content ?? '')
				: String(tag.attributes?.['data-scope'] ?? '');
			const scope = (scopeValue === 'section' ? 'section' : 'siblings') as 'siblings' | 'section';
			const prevLabelMeta = (tag.children ?? []).find(
				(c: any) => Tag.isTag(c) && c.attributes?.['data-field'] === 'prev-label',
			);
			const nextLabelMeta = (tag.children ?? []).find(
				(c: any) => Tag.isTag(c) && c.attributes?.['data-field'] === 'next-label',
			);
			const prevLabel = prevLabelMeta ? String((prevLabelMeta as any).attributes.content ?? '') : undefined;
			const nextLabel = nextLabelMeta ? String((nextLabelMeta as any).attributes.content ?? '') : undefined;

			// Skip when current page is a section index (has children)
			const hasChildren = Array.from(pagesByUrl.values()).some(p => p.parentUrl === pageUrl && p.url !== pageUrl);
			if (hasChildren) {
				return { ...tag, children: [] };
			}

			// 1. Explicit nav order from the layout cascade
			let sequence: string[] | null = null;
			const sequences = collectNavSequences(rootRenderable, pagesByUrl, pageUrl);
			for (const seq of sequences) {
				if (seq.includes(pageUrl)) {
					sequence = seq;
					break;
				}
			}

			let prev: SiblingEntry | null = null;
			let next: SiblingEntry | null = null;
			if (sequence) {
				({ prev, next } = pickPrevNextFromSequence(sequence, pageUrl, pagesByUrl));
			} else {
				// 2. Sibling pages by frontmatter order → directory order
				const siblings = getSiblingPages(pageUrl, pagesByUrl, scope);
				const idx = siblings.findIndex(s => s.url === pageUrl);
				if (idx !== -1) {
					prev = idx > 0 ? siblings[idx - 1] : null;
					next = idx < siblings.length - 1 ? siblings[idx + 1] : null;
				}
			}

			const links: any[] = [];
			if (prev) links.push(buildPaginationLink(prev, 'prev', prevLabel));
			if (next) links.push(buildPaginationLink(next, 'next', nextLabel));

			// Preserve any non-sentinel/non-label meta children (none expected, but defensive)
			const consumed = new Set([PAGINATION_AUTO_SENTINEL, 'prev-label', 'next-label', 'scope']);
			const remaining = (tag.children ?? []).filter((c: any) => {
				if (!Tag.isTag(c)) return true;
				if (c.name !== 'meta') return true;
				const field = c.attributes?.['data-field'];
				return !consumed.has(field);
			});
			return { ...tag, children: [...remaining, ...links] };
		}
		// Explicit prev/next mode — resolve any __slug:foo hrefs through pagesByUrl
		const newChildren = (tag.children ?? []).map((c: any) => {
			if (!Tag.isTag(c)) return c;
			if (c.name === 'a' && typeof c.attributes?.href === 'string' && c.attributes.href.startsWith('__slug:')) {
				const slug = c.attributes.href.slice('__slug:'.length);
				const resolvedUrl = resolveSlugToUrl(slug, pagesByUrl, pageUrl);
				if (resolvedUrl) {
					const page = pagesByUrl.get(resolvedUrl);
					const newLabel = page?.title ?? slug;
					// Replace label text if user didn't override (label child has same text as slug)
					const newChildren = (c.children ?? []).map((child: any) => {
						if (Tag.isTag(child) && child.attributes?.['data-name'] === 'label') {
							const currentLabel = (child.children ?? []).filter((x: any) => typeof x === 'string').join('');
							if (currentLabel === slug) {
								return { ...child, children: [newLabel] };
							}
						}
						return child;
					});
					return { ...c, attributes: { ...c.attributes, href: resolvedUrl }, children: newChildren };
				}
			}
			return c;
		});
		return { ...tag, children: newChildren };
	}

	const newChildren = (tag.children ?? []).map((c: unknown) =>
		resolveAutoPagination(c, pageUrl, pagesByUrl, rootRenderable)
	);
	if (newChildren.every((c: unknown, i: number) => c === tag.children[i])) return tag;
	return { ...tag, children: newChildren };
}

// ─── Blog pipeline helpers ───

interface BlogPostData {
	title: string;
	url: string;
	date: string;
	description: string;
	draft: boolean;
	frontmatter: Record<string, unknown>;
}

function walkBlogTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => void): void {
	if (Tag.isTag(node)) {
		fn(node);
		for (const child of node.children) walkBlogTags(child, fn);
	} else if (Array.isArray(node)) {
		node.forEach(n => walkBlogTags(n, fn));
	}
}

function mapBlogTags(node: unknown, fn: (tag: InstanceType<typeof Tag>) => unknown): unknown {
	if (Tag.isTag(node)) {
		const mapped = fn(node);
		if (mapped !== node) return mapped;
		const newChildren = node.children.map(c => mapBlogTags(c, fn));
		const changed = newChildren.some((c, i) => c !== node.children[i]);
		return changed ? new Tag(node.name, node.attributes, newChildren as any[]) : node;
	}
	if (Array.isArray(node)) return node.map(n => mapBlogTags(n, fn));
	return node;
}

/** Normalise folder path for prefix matching: ensure leading slash and trailing slash */
function normaliseFolderPath(folder: string): string {
	let f = folder.trim();
	if (!f.startsWith('/')) f = '/' + f;
	if (!f.endsWith('/')) f += '/';
	return f;
}

/** Check if a page URL is a direct child of the given folder */
function isInFolder(pageUrl: string, folder: string): boolean {
	if (!pageUrl.startsWith(folder)) return false;
	const rest = pageUrl.slice(folder.length);
	const segments = rest.replace(/\/$/, '').split('/').filter(Boolean);
	return segments.length === 1;
}

/** Parse a simple filter expression like "tag:javascript" into field/value pairs */
function parseBlogFilter(filter: string): Array<{ field: string; value: string }> {
	if (!filter || !filter.trim()) return [];
	return filter.split(',').map(part => {
		const colonIdx = part.indexOf(':');
		if (colonIdx === -1) return { field: part.trim(), value: '' };
		return {
			field: part.slice(0, colonIdx).trim(),
			value: part.slice(colonIdx + 1).trim(),
		};
	});
}

/** Check if a post's frontmatter matches all filter conditions */
function matchesBlogFilter(post: BlogPostData, filters: Array<{ field: string; value: string }>): boolean {
	for (const { field, value } of filters) {
		const fmValue = post.frontmatter[field];
		if (value === '') {
			if (fmValue === undefined || fmValue === null) return false;
		} else if (Array.isArray(fmValue)) {
			if (!fmValue.some(v => String(v).toLowerCase() === value.toLowerCase())) return false;
		} else {
			if (String(fmValue ?? '').toLowerCase() !== value.toLowerCase()) return false;
		}
	}
	return true;
}

/** Sort blog posts by the specified order */
function sortBlogPosts(posts: BlogPostData[], sort: string): BlogPostData[] {
	const sorted = [...posts];
	switch (sort) {
		case 'date-asc':
			sorted.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
			break;
		case 'title-asc':
			sorted.sort((a, b) => a.title.localeCompare(b.title));
			break;
		case 'title-desc':
			sorted.sort((a, b) => b.title.localeCompare(a.title));
			break;
		case 'date-desc':
		default:
			sorted.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
			break;
	}
	return sorted;
}

/** Build an <article> Tag for a single blog post entry */
function createBlogPostTag(post: BlogPostData): InstanceType<typeof Tag> {
	const titleTag = new Tag('h3', {}, [
		new Tag('a', { href: post.url }, [post.title]),
	]);

	const children: any[] = [titleTag];

	if (post.date) {
		children.push(new Tag('time', { datetime: post.date }, [post.date]));
	}

	if (post.description) {
		children.push(new Tag('p', {}, [post.description]));
	}

	return new Tag('article', { 'data-name': 'post' }, children);
}

/** Resolve blog runes in a renderable tree by injecting matching posts */
function resolveBlogPosts(
	renderable: unknown,
	allPosts: BlogPostData[],
	ctx: PipelineContext,
	pageUrl: string,
): unknown {
	let modified = false;
	const result = mapBlogTags(renderable, (tag) => {
		if (tag.attributes['data-rune'] !== 'blog') return tag;

		// SPEC-082: read field values from the bag (bag-first, meta-fallback).
		// The cross-page tree still carries the `data-rune-fields` attribute.
		const folder = readField(tag as never, 'folder') ?? '';
		const sort = readField(tag as never, 'sort') || 'date-desc';
		const filterStr = readField(tag as never, 'filter') ?? '';
		const limitStr = readField(tag as never, 'limit') ?? '';
		const limit = limitStr ? parseInt(limitStr, 10) : undefined;

		if (!folder) {
			ctx.warn('Blog rune missing folder attribute', pageUrl);
			return tag;
		}

		const normalised = normaliseFolderPath(folder);
		const filters = parseBlogFilter(filterStr);

		let posts = allPosts.filter(post => {
			if (post.draft) return false;
			if (!isInFolder(post.url, normalised)) return false;
			if (filters.length > 0 && !matchesBlogFilter(post, filters)) return false;
			return true;
		});

		posts = sortBlogPosts(posts, sort);

		if (limit && limit > 0) {
			posts = posts.slice(0, limit);
		}

		const postsContainer = tag.children.find(
			(c: unknown) => Tag.isTag(c) && c.attributes['data-name'] === 'posts',
		);

		if (!Tag.isTag(postsContainer)) return tag;

		const postTags = posts.map(createBlogPostTag);

		modified = true;
		const newPostsContainer = new Tag(postsContainer.name, postsContainer.attributes, postTags);
		const newChildren = tag.children.map((c: unknown) =>
			c === postsContainer ? newPostsContainer : c,
		);
		return new Tag(tag.name, tag.attributes, newChildren as any[]);
	});

	return modified ? result : renderable;
}

/**
 * Apply core auto-resolutions (breadcrumb, nav, collapsible, cards, pagination,
 * blog, xref) to an arbitrary renderable tree using the same aggregated data
 * the pipeline produces.
 *
 * Used by callers that need to resolve sentinels in renderables outside the
 * per-page pipeline — most notably layout regions, which are parsed once but
 * need per-page URL context for auto-open and auto-pagination.
 */
export function resolveCoreSentinels(
	renderable: unknown,
	pageUrl: string,
	coreData: {
		breadcrumbPaths: Map<string, string[]>;
		pagesByUrl: Map<string, { url: string; title: string; parentUrl: string; description?: string; icon?: string; order?: number }>;
		allPosts: BlogPostData[];
		registry: Readonly<EntityRegistry>;
		/** Compiled xref patterns from `refrakt.config.json#/xrefs`. Empty
		 *  array when no patterns are configured (the resolver's
		 *  "patterns step" then matches nothing and falls through to
		 *  unresolved). */
		xrefPatterns?: CompiledXrefPattern[];
	},
	ctx: PipelineContext,
	/** Extra trees (e.g. layout regions + page content) to scan when looking
	 *  for nav sequences during auto-pagination. Required when calling against
	 *  a layout region where the sidebar nav lives in a different region. */
	navSearchScope?: unknown[],
): unknown {
	let result = resolveAutoBreadcrumbs(renderable, pageUrl, coreData.breadcrumbPaths, coreData.pagesByUrl, ctx);
	result = resolveAutoNavs(result, pageUrl, coreData.pagesByUrl, ctx);
	// SPEC-055 — resolve bare-slug nav items to real <a href> links before any
	// downstream resolver consumes the tree. Must run after auto-nav (which
	// expands `{% nav auto %}` into item children) but before collapsible /
	// cards (which both rely on resolved hrefs).
	result = resolveNavSlugs(result, coreData.pagesByUrl, ctx, pageUrl);
	result = resolveCollapsibleNavs(result, pageUrl, coreData.pagesByUrl);
	result = resolveCardsNavs(result, pageUrl, coreData.pagesByUrl);
	const searchRoot = navSearchScope && navSearchScope.length > 0
		? [result, ...navSearchScope]
		: result;
	result = resolveAutoPagination(result, pageUrl, coreData.pagesByUrl, searchRoot);
	// SPEC-055 — mark aria-current / data-active="ancestor" on resolved nav
	// links per page. Runs after slug + auto-pagination resolution so the
	// item href set is final.
	result = applyNavActiveState(result, pageUrl);
	result = resolveBlogPosts(result, coreData.allPosts, ctx, pageUrl);
	result = resolveXrefs(result, pageUrl, coreData.registry, coreData.xrefPatterns ?? [], ctx);
	return result;
}

/** Options accepted by {@link createCorePipelineHooks}. */
export interface CorePipelineHooksOptions {
	/** Compiled xref patterns from `refrakt.config.json#/xrefs`. Threaded
	 *  through `aggregate` into the postProcess `coreData` shape so the xref
	 *  resolver can use them as a URL-resolution fallback. */
	xrefPatterns?: CompiledXrefPattern[];
	/** Canonical GitHub (or compatible) repository URL — `SiteConfig.repoUrl`
	 *  threaded through to the file-ref resolver (SPEC-078) so it can build
	 *  deep-link source URLs of the form `{repoUrl}/blob/{ref}/{path}#L{...}`. */
	repoUrl?: string;
	/** Git ref appended to GitHub source URLs (branch / tag / commit SHA).
	 *  Defaults to `"main"` when omitted. */
	repoBranch?: string;
	/** Merged Markdoc transform config (tags + nodes from core + every
	 *  loaded plugin) plus the project root. Threaded through `aggregate`
	 *  so the expand postProcess (SPEC-066) can re-transform embedded
	 *  AST subtrees using the same rune schemas the host page used,
	 *  and read source files with the same sandbox boundary as snippet. */
	embedConfig?: {
		tags: Record<string, unknown>;
		nodes: Record<string, unknown>;
		functions?: Record<string, unknown>;
		/** Parsed partials from the content tree's `_partials/` and any
		 *  registered file-root namespaces. Threaded through so partial
		 *  references inside deferred-body templates (collection, expand)
		 *  resolve the same way they do in top-level page transforms. */
		partials?: Record<string, unknown>;
		projectRoot?: string;
	};
}

/**
 * Build core cross-page pipeline hooks parameterized by build-time options.
 *
 * Most callers (existing adapters, tests) use the {@link corePipelineHooks}
 * default below — equivalent to `createCorePipelineHooks()` with no patterns
 * configured. The content-loader bootstrap passes compiled
 * {@link CompiledXrefPattern}s when `refrakt.config.json#/xrefs` is set.
 */
/**
 * Frontmatter keys that control routing/rendering rather than describing the
 * page; excluded from the `page` entity's queryable `data` (SPEC-092 Layer 1) so
 * they don't pollute `collection`/`aggregate` queries. Everything else passes
 * through, so a query can filter/group pages by `tags`, `author`, `image`, or
 * any custom field.
 */
const RESERVED_PAGE_FRONTMATTER = new Set([
	'layout', 'tint', 'tint-mode', 'tint-lock', 'slug', 'redirect',
	// entity-declaration keys (SPEC-092 Layer 2) — meta, not queryable content
	'type', 'id',
]);

export function createCorePipelineHooks(opts: CorePipelineHooksOptions = {}): PluginPipelineHooks {
	const xrefPatterns = opts.xrefPatterns ?? [];
	const embedConfig = opts.embedConfig;
	const repoUrl = opts.repoUrl;
	const repoBranch = opts.repoBranch;

	return {
	preprocess: preprocessSnippets,

	register(pages: readonly TransformedPage[], registry: EntityRegistry, ctx: PipelineContext): void {
		for (const page of pages) {
			const parentUrl = deriveParentUrl(page.url);

			const existingPage = registry.getById('page', page.url);
			if (existingPage && existingPage.sourceUrl !== page.url) {
				ctx.warn(
					`Page '${page.url}' already registered from '${existingPage.sourceUrl}'`,
					page.url,
				);
			}

			// SPEC-092 Layer 1 — pass page frontmatter through to the entity's
			// queryable `data` (minus the routing/render-control keys above). The
			// curated fields below are normalised and win over any raw same-named
			// frontmatter value.
			const passthrough: Record<string, unknown> = {};
			for (const [k, val] of Object.entries(page.frontmatter)) {
				if (!RESERVED_PAGE_FRONTMATTER.has(k)) passthrough[k] = val;
			}

			registry.register({
				type: 'page',
				id: page.url,
				sourceUrl: page.url,
				data: {
					...passthrough,
					title: page.title,
					url: page.url,
					parentUrl,
					draft: page.frontmatter.draft ?? false,
					description: page.frontmatter.description,
					date: page.frontmatter.date,
					order: page.frontmatter.order,
					icon: page.frontmatter.icon,
				},
			});

			for (const h of page.headings) {
				const headingId = `${page.url}#${h.id}`;
				const existingHeading = registry.getById('heading', headingId);
				if (existingHeading && existingHeading.sourceUrl !== page.url) {
					ctx.warn(
						`Heading '${headingId}' already registered from '${existingHeading.sourceUrl}'`,
						page.url,
					);
				}
				registry.register({
					type: 'heading',
					id: headingId,
					sourceUrl: page.url,
					data: { level: h.level, text: h.text, headingId: h.id, url: page.url },
				});
			}
		}

		// SPEC-060 — register every drawer rune as a page-scoped entity so
		// `{% ref "drawer-id" /%}` resolves to the drawer's address.
		registerDrawers(pages, registry, ctx);
	},

	aggregate(registry: Readonly<EntityRegistry>, ctx: PipelineContext) {
		const pageEntities = registry.getAll('page') as unknown as Array<{
			id: string;
			data: { url: string; title: string; parentUrl: string; description?: string; icon?: string; order?: number };
		}>;

		const pages = pageEntities.map(e => ({
			url: e.data.url,
			title: e.data.title,
			parentUrl: e.data.parentUrl,
			description: e.data.description,
			icon: e.data.icon,
			order: e.data.order,
		}));

		const pageTree = buildPageTree(pages);
		const breadcrumbPaths = buildBreadcrumbPaths(pages);

		// Quick lookup: url → { url, title } for postProcess use
		const pagesByUrl = new Map(pages.map(p => [p.url, p]));

		// Build heading index: "url#id" → heading data
		const headingIndex = new Map<string, Record<string, unknown>>();
		for (const h of registry.getAll('heading')) {
			headingIndex.set(h.id, h.data);
		}

		// Blog: collect all pages as potential blog posts
		const allPosts: BlogPostData[] = pageEntities.map(e => ({
			title: (e.data as any).title as string || '',
			url: (e.data as any).url as string || e.id,
			date: (e.data as any).date as string || '',
			description: (e.data as any).description as string || '',
			draft: (e.data as any).draft as boolean || false,
			frontmatter: e.data as Record<string, unknown>,
		}));

		return { pageTree, breadcrumbPaths, pagesByUrl, headingIndex, allPosts, registry, xrefPatterns, embedConfig, repoUrl, repoBranch };
	},

	postProcess(page: TransformedPage, aggregated: AggregatedData, ctx: PipelineContext): TransformedPage {
		const coreData = aggregated['__core__'] as {
			breadcrumbPaths: Map<string, string[]>;
			pagesByUrl: Map<string, { url: string; title: string; parentUrl: string }>;
			allPosts: BlogPostData[];
			registry: Readonly<EntityRegistry>;
			xrefPatterns?: CompiledXrefPattern[];
			repoUrl?: string;
			repoBranch?: string;
			embedConfig?: {
				tags: Record<string, unknown>;
				nodes: Record<string, unknown>;
				functions?: Record<string, unknown>;
				partials?: Record<string, unknown>;
				projectRoot?: string;
			};
		} | undefined;

		if (!coreData) return page;

		let renderable = resolveAutoBreadcrumbs(
			page.renderable,
			page.url,
			coreData.breadcrumbPaths,
			coreData.pagesByUrl,
			ctx,
		);

		renderable = resolveAutoNavs(
			renderable,
			page.url,
			coreData.pagesByUrl,
			ctx,
		);

		// SPEC-055 build-time slug resolution (see note in resolveCoreSentinels).
		renderable = resolveNavSlugs(
			renderable,
			coreData.pagesByUrl,
			ctx,
			page.url,
		);

		renderable = resolveCollapsibleNavs(
			renderable,
			page.url,
			coreData.pagesByUrl,
		);

		renderable = resolveCardsNavs(
			renderable,
			page.url,
			coreData.pagesByUrl,
		);

		renderable = resolveAutoPagination(
			renderable,
			page.url,
			coreData.pagesByUrl,
			renderable,
		);

		// SPEC-055 build-time active state.
		renderable = applyNavActiveState(renderable, page.url);

		renderable = resolveBlogPosts(
			renderable,
			coreData.allPosts,
			ctx,
			page.url,
		);

		// SPEC-060 — rewrite `data-drawer-title-auto` placeholders to the
		// appropriate `h{n}` based on outline depth. Runs before xref
		// resolution so the rewritten title doesn't carry the sentinel
		// attribute into the rendered HTML.
		renderable = resolveAutoDrawerTitleLevels(renderable);

		// SPEC-078 — bind file-ref sentinels to their GitHub URLs and emit
		// the hoist sentinel when `preview="drawer"`. Must run before
		// `hoistPreviewDrawers` (which consumes the hoist sentinel) and
		// before xref resolution (so the file-ref's inline `<a>` carries
		// its final href into the rendered tree).
		renderable = resolveFileRefs(
			renderable,
			page.url,
			coreData.repoUrl,
			coreData.repoBranch,
			ctx,
		);

		// SPEC-078 — rewrite xref placeholders carrying `data-xref-preview=
		// "drawer"` into an inline `<a href="#drawer-{id}">` + hoist
		// sentinel. Non-preview xref placeholders pass through to
		// resolveXrefs later in the chain.
		renderable = resolveXrefPreviews(
			renderable,
			page.url,
			coreData.registry,
			ctx,
		);

		// SPEC-078 hoist mechanism — collect `preview="drawer"` sentinels
		// from file-ref / xref / future reference runes and emit hoisted
		// `<section class="rf-drawer">` at the page root. Runs before
		// expand resolution so an xref-preview drawer's body (which uses
		// the expand resolver internally) is resolved by the same pass.
		renderable = hoistPreviewDrawers(
			renderable,
			page.url,
			coreData.registry,
			coreData.embedConfig?.projectRoot,
			ctx,
		);

		// SPEC-066 expand resolution — substitutes embedded entity content
		// before xref runs so refs inside substituted content are resolved
		// by the same pass as host-page refs.
		renderable = resolveExpands(
			renderable,
			page.url,
			coreData.registry,
			coreData.xrefPatterns ?? [],
			coreData.embedConfig,
			ctx,
		);

		// SPEC-070 collection resolution — runs after expand and before xref so
		// item-template `{% ref %}`s are resolved by the same xref pass.
		renderable = resolveCollections(
			renderable,
			page.url,
			coreData.registry,
			coreData.embedConfig,
			ctx,
		);

		// SPEC-072 relationships resolution — same placement rationale as
		// collection: after expand, before xref (so item-template `{% ref %}`s
		// resolve in the same xref pass).
		renderable = resolveRelationships(
			renderable,
			page.url,
			coreData.registry,
			coreData.embedConfig,
			ctx,
		);

		// SPEC-076 aggregate resolution — same placement as collection /
		// relationships: after expand, before xref (so any `{% ref %}` inside
		// the body template resolves in the same xref pass).
		renderable = resolveAggregates(
			renderable,
			page.url,
			coreData.registry,
			coreData.embedConfig,
			ctx,
		);

		// SPEC-093 — data-bound sandboxes: evaluate the bound query against the
		// registry and inject the JSON for the iframe to expose as window.RF_DATA.
		renderable = resolveDataBindings(renderable, coreData.registry, ctx, page.url);

		renderable = resolveXrefs(
			renderable,
			page.url,
			coreData.registry,
			coreData.xrefPatterns ?? [],
			ctx,
		);

		// SPEC-062 standalone snippet wrap: turn `<pre data-snippet-source>`
		// into `<figure class="rf-snippet">` when not inside a fence-consuming
		// container (codegroup, diff). The wrap is a no-op when the page
		// has no snippet-derived fences.
		const wrappedPage = wrapStandaloneSnippets(
			renderable === page.renderable ? page : { ...page, renderable },
			aggregated,
			ctx,
		);

		// SPEC-066 outline-scope walkers: prefix heading IDs and drop TOC
		// items inside any `data-outline-scope` subtree. Generic — any rune
		// can set the attribute and get the behaviour. Runs last so it can
		// see the final tree (including expand-substituted content once
		// that lands in v0.15.0).
		applyOutlineScopeWalkers(wrappedPage.renderable);

		// Refresh `page.headings` from the final renderable. Parse-time
		// `extractHeadings` only saw the raw AST — anything inlined by
		// postProcess (expand `level=N`, collection bodies) wouldn't make
		// it into the parse-time list, leaving the page TOC blind to those
		// headings. Skips `data-outline-scope` subtrees so peer-document
		// embeds stay isolated, matching the TOC walker.
		const harvested = harvestHeadingsFromRenderable(wrappedPage.renderable);
		if (harvested.length > 0 || wrappedPage.headings.length > 0) {
			return { ...wrappedPage, headings: harvested };
		}

		return wrappedPage;
	},
	};
}

/**
 * Core cross-page pipeline hooks (no xref patterns configured).
 *
 * Equivalent to `createCorePipelineHooks()`. The content loader bootstrap
 * uses {@link createCorePipelineHooks} directly when
 * `refrakt.config.json#/xrefs` is configured so the resolver can use the
 * compiled patterns as a URL-resolution fallback. Run for every site,
 * before any plugin hooks. Registers page and heading entities, aggregates
 * the page tree and breadcrumb paths, and resolves blog post listings.
 */
export const corePipelineHooks: PluginPipelineHooks = createCorePipelineHooks();
