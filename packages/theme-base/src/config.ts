import type { ThemeConfig } from '@refrakt-md/transform';

/** Base theme configuration — universal rune-to-BEM-block mappings shared by all themes.
 *  Icons are empty; themes provide their own icon SVGs via mergeThemeConfig. */
export const baseConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		// ─── Simple runes (block name only, engine adds BEM classes) ───

		Accordion: { block: 'accordion' },
		AccordionItem: { block: 'accordion-item', autoLabel: { name: 'header' } },
		Details: { block: 'details', autoLabel: { summary: 'summary' } },
		Grid: { block: 'grid' },
		CodeGroup: {
			block: 'codegroup',
			structure: {
				topbar: {
					tag: 'div', before: true,
					children: [
						{ tag: 'span', ref: 'dot' },
						{ tag: 'span', ref: 'dot' },
						{ tag: 'span', ref: 'dot' },
					],
				},
			},
		},
		PageSection: { block: 'page-section' },
		TableOfContents: { block: 'toc' },
		Embed: { block: 'embed' },
		Breadcrumb: { block: 'breadcrumb' },
		BreadcrumbItem: { block: 'breadcrumb-item' },
		Testimonial: { block: 'testimonial' },
		Timeline: { block: 'timeline', modifiers: { direction: { source: 'meta', default: 'vertical' } } },
		TimelineEntry: { block: 'timeline-entry' },
		Changelog: { block: 'changelog' },
		ChangelogRelease: { block: 'changelog-release' },
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
		CastMember: { block: 'cast-member' },
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
		RecipeIngredient: { block: 'recipe-ingredient' },
		Pricing: { block: 'pricing' },
		Tier: { block: 'tier' },
		FeaturedTier: { block: 'featured-tier' },
		Feature: { block: 'feature', modifiers: { split: { source: 'meta' }, mirror: { source: 'meta' } }, contextModifiers: { 'Hero': 'in-hero', 'Grid': 'in-grid' } },
		FeatureDefinition: { block: 'feature-definition' },
		Steps: { block: 'steps' },
		Step: { block: 'step', modifiers: { split: { source: 'meta' }, mirror: { source: 'meta' } } },
		Nav: { block: 'nav' },
		NavGroup: { block: 'nav-group' },
		NavItem: { block: 'nav-item' },
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
		MusicRecording: { block: 'music-recording' },

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
			modifiers: { alignment: { source: 'meta', default: 'left' } },
		},
		Annotate: {
			block: 'annotate',
			modifiers: { style: { source: 'meta', default: 'margin' } },
		},
		AnnotateNote: { block: 'annotate-note' },
		Storyboard: {
			block: 'storyboard',
			modifiers: { style: { source: 'meta', default: 'clean' } },
		},
		StoryboardPanel: { block: 'storyboard-panel' },
		Bento: { block: 'bento' },
		BentoCell: {
			block: 'bento-cell',
			modifiers: { size: { source: 'meta', default: 'medium' } },
		},
		Comparison: { block: 'comparison' },
		ComparisonColumn: { block: 'comparison-column' },
		ComparisonRow: {
			block: 'comparison-row',
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
		Tab: { block: 'tab' },
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
		FormField: { block: 'form-field' },
		Reveal: {
			block: 'reveal',
			modifiers: {
				mode: { source: 'meta', default: 'click' },
			},
		},
		RevealStep: { block: 'reveal-step' },
		Diagram: { block: 'diagram' },
		Map: {
			block: 'map',
			modifiers: {
				style: { source: 'meta', default: 'street' },
				height: { source: 'meta', default: 'medium' },
			},
		},
		MapPin: { block: 'map-pin' },
		Preview: {
			block: 'preview',
			modifiers: {
				theme: { source: 'meta', default: 'auto' },
				width: { source: 'meta', default: 'wide' },
				responsive: { source: 'meta' },
				title: { source: 'meta' },
			},
		},
		Sandbox: { block: 'sandbox' },
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
		SymbolGroup: { block: 'symbol-group' },
		SymbolMember: { block: 'symbol-member' },

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
		},
		Typography: {
			block: 'typography',
			modifiers: {
				title: { source: 'meta' },
				showSizes: { source: 'meta' },
				showWeights: { source: 'meta' },
				showCharset: { source: 'meta' },
			},
		},
		Spacing: {
			block: 'spacing',
			modifiers: {
				title: { source: 'meta' },
			},
		},
		DesignContext: {
			block: 'design-context',
			modifiers: {
				title: { source: 'meta' },
			},
		},
	},
};
