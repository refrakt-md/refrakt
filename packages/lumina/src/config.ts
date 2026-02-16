import type { ThemeConfig } from '@refrakt-md/transform';

/** Lumina theme configuration — drives the identity transform */
export const luminaConfig: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {
		hint: {
			note: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
			warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
			caution: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
			check: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
		},
	},
	runes: {
		// ─── Simple runes (block name only, engine adds BEM classes) ───

		Accordion: { block: 'accordion' },
		AccordionItem: { block: 'accordion-item', autoLabel: { name: 'header' } },
		Details: { block: 'details', autoLabel: { summary: 'summary' } },
		Grid: { block: 'grid' },
		Editor: {
			block: 'editor',
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
		Timeline: { block: 'timeline' },
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
		Feature: { block: 'feature', contextModifiers: { 'Hero': 'in-hero', 'Grid': 'in-grid' } },
		FeatureDefinition: { block: 'feature-definition' },
		Steps: { block: 'steps' },
		Step: { block: 'step' },
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
		DataTable: { block: 'datatable' },
		Form: {
			block: 'form',
			modifiers: { style: { source: 'meta', default: 'stacked' } },
		},
		FormField: {
			block: 'form-field',
			modifiers: { fieldType: { source: 'meta', default: 'text' } },
		},
		Reveal: { block: 'reveal' },
		RevealStep: { block: 'reveal-step' },
		Diagram: { block: 'diagram' },
	},
};
