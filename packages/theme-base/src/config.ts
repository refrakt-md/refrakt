import type { ThemeConfig, SerializedTag } from '@refrakt-md/transform';
import { isTag, makeTag, renderToHtml, findMeta, findByDataName, readMeta } from '@refrakt-md/transform';

/** Base theme configuration — universal rune-to-BEM-block mappings shared by all themes.
 *  Icons are empty; themes provide their own icon SVGs via mergeThemeConfig. */
export const baseConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		// ─── Simple runes (block name only, engine adds BEM classes) ───

		Accordion: { block: 'accordion' },
		AccordionItem: { block: 'accordion-item', parent: 'Accordion', autoLabel: { name: 'header' } },
		Details: { block: 'details', autoLabel: { summary: 'summary' } },
		Grid: { block: 'grid' },
		CodeGroup: {
			block: 'codegroup',
			modifiers: { title: { source: 'meta' } },
			structure: {
				topbar: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'dot' },
						{ tag: 'span', ref: 'dot' },
						{ tag: 'span', ref: 'dot' },
						{ tag: 'span', ref: 'title', metaText: 'title', condition: 'title' },
					],
				},
			},
		},
		PageSection: { block: 'page-section' },
		TableOfContents: { block: 'toc' },
		Embed: { block: 'embed' },
		Breadcrumb: { block: 'breadcrumb' },
		BreadcrumbItem: { block: 'breadcrumb-item', parent: 'Breadcrumb' },
		Testimonial: { block: 'testimonial' },
		Timeline: { block: 'timeline', modifiers: { direction: { source: 'meta', default: 'vertical' } } },
		TimelineEntry: { block: 'timeline-entry', parent: 'Timeline' },
		Changelog: { block: 'changelog' },
		ChangelogRelease: { block: 'changelog-release', parent: 'Changelog' },
		Event: {
			block: 'event',
			contentWrapper: { tag: 'div', ref: 'content' },
			modifiers: {
				date: { source: 'meta' },
				endDate: { source: 'meta' },
				location: { source: 'meta' },
				url: { source: 'meta' },
			},
			structure: {
				details: {
					tag: 'div', before: true,
					children: [
						{
							tag: 'div', ref: 'detail', condition: 'date',
							children: [
								{ tag: 'span', ref: 'label', children: ['Date'] },
								{ tag: 'span', ref: 'value', metaText: 'date' },
								{ tag: 'span', ref: 'end-date', metaText: 'endDate', textPrefix: ' — ', condition: 'endDate' },
							],
						},
						{
							tag: 'div', ref: 'detail', condition: 'location',
							children: [
								{ tag: 'span', ref: 'label', children: ['Location'] },
								{ tag: 'span', ref: 'value', metaText: 'location' },
							],
						},
						{
							tag: 'a', ref: 'register', condition: 'url',
							attrs: { href: { fromModifier: 'url' } },
							children: ['Register'],
						},
					],
				},
			},
		},
		Organization: { block: 'organization' },
		Cast: { block: 'cast' },
		CastMember: { block: 'cast-member', parent: 'Cast' },
		Recipe: {
			block: 'recipe',
			contentWrapper: { tag: 'div', ref: 'content' },
			modifiers: {
				prepTime: { source: 'meta' },
				cookTime: { source: 'meta' },
				servings: { source: 'meta' },
				difficulty: { source: 'meta', default: 'medium' },
			},
			structure: {
				meta: {
					tag: 'div', before: true,
					conditionAny: ['prepTime', 'cookTime', 'servings', 'difficulty'],
					children: [
						{ tag: 'span', ref: 'meta-item', metaText: 'prepTime', transform: 'duration', textPrefix: 'Prep: ', condition: 'prepTime' },
						{ tag: 'span', ref: 'meta-item', metaText: 'cookTime', transform: 'duration', textPrefix: 'Cook: ', condition: 'cookTime' },
						{ tag: 'span', ref: 'meta-item', metaText: 'servings', textPrefix: 'Serves: ', condition: 'servings' },
						{ tag: 'span', ref: 'badge', metaText: 'difficulty', condition: 'difficulty' },
					],
				},
			},
		},
		RecipeIngredient: { block: 'recipe-ingredient', parent: 'Recipe' },
		Pricing: { block: 'pricing' },
		Tier: { block: 'tier', parent: 'Pricing' },
		FeaturedTier: { block: 'tier', parent: 'Pricing', staticModifiers: ['featured'] },
		Feature: { block: 'feature', modifiers: { split: { source: 'meta' }, mirror: { source: 'meta' } }, contextModifiers: { 'Hero': 'in-hero', 'Grid': 'in-grid' } },
		FeatureDefinition: { block: 'feature-definition', parent: 'Feature' },
		Steps: { block: 'steps' },
		Step: { block: 'step', parent: 'Steps', modifiers: { split: { source: 'meta' }, mirror: { source: 'meta' } } },
		Nav: {
			block: 'nav',
			postTransform(node) {
				return { ...node, name: 'rf-nav' };
			},
		},
		NavGroup: { block: 'nav-group', parent: 'Nav' },
		NavItem: {
			block: 'nav-item',
			parent: 'Nav',
			postTransform(node) {
				// Extract slug from span[property="slug"] child → data-slug attribute
				// Keep slug text as visible fallback for SSR; web component replaces with <a> links
				let slug = '';
				const children = node.children.filter(child => {
					if (isTag(child) && child.name === 'span' && child.attributes.property === 'slug') {
						slug = child.children.filter((c): c is string => typeof c === 'string').join('');
						return false; // remove slug span from DOM
					}
					return true;
				});

				// Add slug text as visible fallback content (replaced by web component at runtime)
				if (slug) {
					children.unshift(slug);
				}

				return {
					...node,
					attributes: {
						...node.attributes,
						...(slug ? { 'data-slug': slug } : {}),
					},
					children,
				};
			},
		},
		Api: {
			block: 'api',
			contentWrapper: { tag: 'div', ref: 'body' },
			modifiers: {
				method: { source: 'meta', default: 'GET' },
				path: { source: 'meta' },
				auth: { source: 'meta' },
			},
			structure: {
				header: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'method', metaText: 'method' },
						{ tag: 'code', ref: 'path', metaText: 'path' },
						{ tag: 'span', ref: 'auth', metaText: 'auth', condition: 'auth' },
					],
				},
			},
		},
		Diff: {
			block: 'diff',
			modifiers: { mode: { source: 'meta', default: 'unified' } },
		},
		Chart: { block: 'chart' },
		MusicPlaylist: { block: 'music-playlist' },
		MusicRecording: { block: 'music-recording', parent: 'MusicPlaylist' },

		// ─── Runes with modifier meta tags ───

		Hint: {
			block: 'hint',
			modifiers: { hintType: { source: 'meta', default: 'note' } },
			contextModifiers: { 'Hero': 'in-hero', 'Feature': 'in-feature' },
			structure: {
				header: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'icon', icon: { group: 'hint', variant: 'hintType' } },
						{ tag: 'span', ref: 'title', metaText: 'hintType' },
					],
				},
			},
		},
		Hero: {
			block: 'hero',
			modifiers: { align: { source: 'meta', default: 'center' } },
			contextModifiers: { 'Feature': 'in-feature' },
		},
		CallToAction: { block: 'cta', contextModifiers: { 'Hero': 'in-hero', 'Pricing': 'in-pricing' } },
		Figure: {
			block: 'figure',
			modifiers: {
				size: { source: 'meta', default: 'default' },
				align: { source: 'meta', default: 'center' },
			},
		},
		Sidenote: {
			block: 'sidenote',
			modifiers: { style: { source: 'meta', default: 'sidenote' } },
		},
		Compare: {
			block: 'compare',
			modifiers: { layout: { source: 'meta', default: 'side-by-side' } },
		},
		Conversation: { block: 'conversation' },
		ConversationMessage: {
			block: 'conversation-message',
			parent: 'Conversation',
			modifiers: { alignment: { source: 'meta', default: 'left' } },
		},
		Annotate: {
			block: 'annotate',
			modifiers: { style: { source: 'meta', default: 'margin' } },
		},
		AnnotateNote: { block: 'annotate-note', parent: 'Annotate' },
		Storyboard: {
			block: 'storyboard',
			modifiers: {
				style: { source: 'meta', default: 'clean' },
				columns: { source: 'meta', default: '3' },
			},
			styles: { columns: '--sb-columns' },
		},
		StoryboardPanel: { block: 'storyboard-panel', parent: 'Storyboard' },
		Bento: {
			block: 'bento',
			modifiers: {
				columns: { source: 'meta', default: '4' },
				gap: { source: 'meta', default: '1rem' },
			},
			styles: {
				columns: '--bento-columns',
				gap: '--bento-gap',
			},
		},
		BentoCell: {
			block: 'bento-cell',
			parent: 'Bento',
			modifiers: { size: { source: 'meta', default: 'medium' } },
			autoLabel: { name: 'title' },
		},
		Comparison: { block: 'comparison' },
		ComparisonColumn: { block: 'comparison-column', parent: 'Comparison' },
		ComparisonRow: {
			block: 'comparison-row',
			parent: 'Comparison',
			modifiers: { rowType: { source: 'meta', default: 'text' } },
		},
		HowTo: {
			block: 'howto',
			contentWrapper: { tag: 'div', ref: 'content' },
			modifiers: {
				estimatedTime: { source: 'meta' },
				difficulty: { source: 'meta', default: 'medium' },
			},
			structure: {
				meta: {
					tag: 'div', before: true,
					conditionAny: ['estimatedTime', 'difficulty'],
					children: [
						{ tag: 'span', ref: 'meta-item', metaText: 'estimatedTime', transform: 'duration', textPrefix: 'Estimated time: ', condition: 'estimatedTime' },
						{ tag: 'span', ref: 'meta-item', metaText: 'difficulty', textPrefix: 'Difficulty: ', condition: 'difficulty' },
					],
				},
			},
		},

		// ─── Interactive runes (still get BEM classes, components add behavior) ───

		TabGroup: { block: 'tabs' },
		Tab: { block: 'tab', parent: 'TabGroup' },
		DataTable: {
			block: 'datatable',
			modifiers: {
				searchable: { source: 'meta', default: 'false' },
				sortable: { source: 'meta' },
				pageSize: { source: 'meta', default: '0' },
				defaultSort: { source: 'meta' },
			},
		},
		Form: {
			block: 'form',
			modifiers: {
				style: { source: 'meta', default: 'stacked' },
				action: { source: 'meta' },
				method: { source: 'meta', default: 'POST' },
				success: { source: 'meta' },
				error: { source: 'meta' },
				honeypot: { source: 'meta', default: 'true' },
			},
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
			modifiers: {
				mode: { source: 'meta', default: 'click' },
			},
		},
		RevealStep: { block: 'reveal-step', parent: 'Reveal' },
		Diagram: {
			block: 'diagram',
			postTransform(node) {
				const block = node.attributes.class?.split(' ')[0] || 'rf-diagram';
				const language = readMeta(node, 'language') || 'mermaid';
				const title = readMeta(node, 'title') || '';
				const sourceMeta = findByDataName(node, 'source');
				const source = sourceMeta?.attributes?.content || '';

				// Build fallback HTML (visible in SSR, replaced by web component)
				const children: (SerializedTag | string)[] = [];
				if (title) {
					children.push(makeTag('figcaption', { class: `${block}__title` }, [title]));
				}
				const containerChildren: (SerializedTag | string)[] = source
					? [makeTag('pre', { class: `${block}__source` }, [makeTag('code', {}, [source])])]
					: [];
				children.push(makeTag('div', { class: `${block}__container` }, containerChildren));

				// Hidden source for web component to read
				if (source) {
					children.push(makeTag('div', { 'data-content': 'source', style: 'display:none' }, [source]));
				}

				return {
					...node,
					name: 'rf-diagram',
					attributes: { ...node.attributes, 'data-language': language },
					children,
				};
			},
		},
		Map: {
			block: 'map',
			modifiers: {
				style: { source: 'meta', default: 'street' },
				height: { source: 'meta', default: 'medium' },
			},
			postTransform(node) {
				// Move remaining meta values to data attributes for the web component
				const metaProps = ['zoom', 'center', 'provider', 'interactive', 'route', 'cluster', 'apiKey'] as const;
				const dataAttrs: Record<string, string> = {};
				for (const prop of metaProps) {
					const val = readMeta(node, prop);
					if (val) {
						const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
						dataAttrs[`data-${kebab}`] = val;
					}
				}

				// Remove consumed meta children
				const children = node.children.filter(child => {
					if (!isTag(child) || child.name !== 'meta') return true;
					const prop = child.attributes.property;
					return !(metaProps as readonly string[]).includes(prop);
				});

				return {
					...node,
					name: 'rf-map',
					attributes: { ...node.attributes, ...dataAttrs },
					children,
				};
			},
		},
		MapPin: { block: 'map-pin', parent: 'Map' },
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

				const themedPre: SerializedTag = makeTag('pre', {
					property: 'themedSource',
					'data-language': 'html',
				}, [
					makeTag('code', { 'data-language': 'html' }, [html]),
				]);

				return { ...node, children: [...node.children, themedPre] };
			},
		},
		Sandbox: {
			block: 'sandbox',
			postTransform(node) {
				// Read meta values
				const content = readMeta(node, 'content') || '';
				const framework = readMeta(node, 'framework') || '';
				const dependencies = readMeta(node, 'dependencies') || '';
				const label = readMeta(node, 'label') || '';
				const height = readMeta(node, 'height') || 'auto';

				// Keep non-meta children (fallback pre, source panels)
				const fallbackChildren = node.children.filter(child => {
					if (!isTag(child)) return true;
					if (child.name === 'meta') return false;
					return true;
				});

				// Add hidden content div for web component
				const children = [
					...fallbackChildren,
					makeTag('div', { 'data-content': 'source', style: 'display:none' }, [content]),
				];

				return {
					...node,
					name: 'rf-sandbox',
					attributes: {
						...node.attributes,
						...(framework ? { 'data-framework': framework } : {}),
						...(dependencies ? { 'data-dependencies': dependencies } : {}),
						...(label ? { 'data-label': label } : {}),
						'data-height': height,
					},
					children,
				};
			},
		},
		Symbol: {
			block: 'symbol',
			contentWrapper: { tag: 'div', ref: 'body' },
			modifiers: {
				kind: { source: 'meta', default: 'function' },
				lang: { source: 'meta', default: 'typescript' },
				since: { source: 'meta' },
				deprecated: { source: 'meta' },
				source: { source: 'meta' },
			},
			structure: {
				header: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'kind-badge', metaText: 'kind' },
						{ tag: 'span', ref: 'lang-badge', metaText: 'lang' },
						{ tag: 'span', ref: 'since-badge', metaText: 'since', textPrefix: 'Since ', condition: 'since' },
						{ tag: 'span', ref: 'deprecated-badge', metaText: 'deprecated', textPrefix: 'Deprecated ', condition: 'deprecated' },
						{ tag: 'a', ref: 'source-link', condition: 'source', attrs: { href: { fromModifier: 'source' } }, children: ['Source'] },
					],
				},
			},
		},
		SymbolGroup: { block: 'symbol-group', parent: 'Symbol' },
		SymbolMember: { block: 'symbol-member', parent: 'Symbol' },

		// ─── Design runes ───

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
	},
};
