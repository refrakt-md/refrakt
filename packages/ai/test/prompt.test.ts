import { describe, it, expect } from 'vitest';
import { generateSystemPrompt, generateSystemPromptParts } from '../src/prompt.js';
import { getChatModeRunes } from '../src/modes/chat.js';
import { runes } from '@refrakt-md/runes';

describe('generateSystemPrompt', () => {
	const prompt = generateSystemPrompt(runes);

	it('includes top-level rune names as headings', () => {
		expect(prompt).toContain('### hint');
		expect(prompt).toContain('### grid');
		expect(prompt).toContain('### tabs');
		expect(prompt).toContain('### codegroup');
		expect(prompt).toContain('### nav');
		expect(prompt).toContain('### accordion');
		expect(prompt).toContain('### embed');
	});

	it('includes rune descriptions', () => {
		expect(prompt).toContain('Callout/admonition block');
		expect(prompt).toContain('Grid layout container');
		expect(prompt).toContain('Tabbed interface');
	});

	it('includes aliases', () => {
		expect(prompt).toContain('Aliases: callout, alert');
		expect(prompt).toContain('Aliases: columns');
		expect(prompt).toContain('Aliases: faq');
	});

	it('includes attribute types and constraints', () => {
		// hint type attribute with matches
		expect(prompt).toContain('"caution"');
		expect(prompt).toContain('"check"');
		expect(prompt).toContain('"note"');
		expect(prompt).toContain('"warning"');

		// region name attribute (required)
		expect(prompt).toContain('name: string (required)');

		// grid columns attribute (optional)
		expect(prompt).toContain('columns: number (optional)');
	});

	it('includes examples with rune syntax', () => {
		expect(prompt).toContain('{% hint type="note" %}');
		expect(prompt).toContain('{% grid %}');
		expect(prompt).toContain('{% tabs %}');
	});

	it('excludes child-only runes', () => {
		// These should NOT appear as section headings
		expect(prompt).not.toMatch(/^### error$/m);
		expect(prompt).not.toMatch(/^### tab$/m);
		expect(prompt).not.toMatch(/^### budget-category$/m);
		expect(prompt).not.toMatch(/^### conversation-message$/m);
	});

	it('does not include frontmatter instructions in base prompt', () => {
		// Frontmatter moved to writePrompt() — base prompt is shared with chat
		expect(prompt).not.toContain('title: Page Title');
	});

	it('includes writing rules', () => {
		expect(prompt).toContain('Do NOT invent rune names');
		expect(prompt).toContain('Horizontal rules');
	});
});

describe('mode guidance', () => {
	it('includes design guidelines when mode is design', () => {
		const designRunes = getChatModeRunes('design');
		const [, runeVocab] = generateSystemPromptParts(runes, designRunes, 'design');
		expect(runeVocab).toContain('Design Mode Guidelines');
		expect(runeVocab).toContain('sandbox');
		expect(runeVocab).toContain('Raw HTML written as Markdown will NOT render');
	});

	it('does not include guidance without mode', () => {
		const [, runeVocab] = generateSystemPromptParts(runes);
		expect(runeVocab).not.toContain('Design Mode Guidelines');
	});

	it('includes general guidelines when mode is general', () => {
		const generalRunes = getChatModeRunes('general');
		const [, runeVocab] = generateSystemPromptParts(runes, generalRunes, 'general');
		expect(runeVocab).toContain('General Mode Guidelines');
		expect(runeVocab).not.toContain('Design Mode Guidelines');
	});

	it('includes marketing guidelines when mode is marketing', () => {
		const marketingRunes = getChatModeRunes('marketing');
		const [, runeVocab] = generateSystemPromptParts(runes, marketingRunes, 'marketing');
		expect(runeVocab).toContain('Marketing Mode Guidelines');
		expect(runeVocab).toContain('hero → features → social proof');
	});

	it('includes code guidelines when mode is code', () => {
		const codeRunes = getChatModeRunes('code');
		const [, runeVocab] = generateSystemPromptParts(runes, codeRunes, 'code');
		expect(runeVocab).toContain('Code & Docs Mode Guidelines');
	});

	it('includes content guidelines when mode is content', () => {
		const contentRunes = getChatModeRunes('content');
		const [, runeVocab] = generateSystemPromptParts(runes, contentRunes, 'content');
		expect(runeVocab).toContain('Content Mode Guidelines');
	});

	it('includes travel guidelines when mode is travel', () => {
		const travelRunes = getChatModeRunes('travel');
		const [, runeVocab] = generateSystemPromptParts(runes, travelRunes, 'travel');
		expect(runeVocab).toContain('Travel Mode Guidelines');
	});
});

describe('authoring hints from packages', () => {
	it('renders authoring hints under an "Authoring notes" heading', () => {
		const runesWithHints: Record<string, any> = {
			'custom-widget': {
				name: 'custom-widget',
				aliases: [],
				description: 'A custom widget for dashboards',
				schema: { attributes: {} },
				authoringHints: 'Best for dashboard widgets that display real-time metrics. Pair with a refresh interval when the data changes often.',
			},
		};

		const prompt = generateSystemPrompt(runesWithHints);
		expect(prompt).toContain('### custom-widget');
		expect(prompt).toContain('A custom widget for dashboards');
		expect(prompt).toContain('Authoring notes:');
		expect(prompt).toContain('Best for dashboard widgets that display real-time metrics');
	});

	it('omits the authoring notes section when not provided', () => {
		const runesWithoutHints: Record<string, any> = {
			'simple-rune': {
				name: 'simple-rune',
				aliases: [],
				description: 'A simple rune',
				schema: { attributes: {} },
			},
		};

		const prompt = generateSystemPrompt(runesWithoutHints);
		expect(prompt).toContain('### simple-rune');
		expect(prompt).toContain('A simple rune');
		expect(prompt).not.toContain('Authoring notes:');
	});

	it('includes authoring hints alongside other metadata', () => {
		const runesWithAll: Record<string, any> = {
			'full-rune': {
				name: 'full-rune',
				aliases: ['fr'],
				description: 'A fully-configured rune',
				schema: {
					attributes: {
						variant: { type: String, matches: ['a', 'b', 'c'] },
					},
				},
				authoringHints: 'Supports dynamic data binding and auto-refresh intervals — set the refresh attribute in seconds.',
			},
		};

		const prompt = generateSystemPrompt(runesWithAll);
		expect(prompt).toContain('### full-rune');
		expect(prompt).toContain('Aliases: fr');
		expect(prompt).toContain('Authoring notes:');
		expect(prompt).toContain('Supports dynamic data binding and auto-refresh intervals');
		expect(prompt).toContain('"a" | "b" | "c"');
	});

	it('handles empty authoring hints gracefully', () => {
		const runesWithEmptyHints: Record<string, any> = {
			'empty-hints-rune': {
				name: 'empty-hints-rune',
				aliases: [],
				description: 'A rune with empty authoring hints',
				schema: { attributes: {} },
				authoringHints: '',
			},
		};

		// Should not throw, and should skip the Authoring notes section
		const prompt = generateSystemPrompt(runesWithEmptyHints);
		expect(prompt).toContain('### empty-hints-rune');
		expect(prompt).not.toContain('Authoring notes:');
	});
});

describe('rune classification', () => {
	it('excludes hero/cta/feature from design mode', () => {
		const designRunes = getChatModeRunes('design')!;
		expect(designRunes.has('hero')).toBe(false);
		expect(designRunes.has('cta')).toBe(false);
		expect(designRunes.has('feature')).toBe(false);
	});

	it('excludes hero/cta/feature from code mode', () => {
		const codeRunes = getChatModeRunes('code')!;
		expect(codeRunes.has('hero')).toBe(false);
		expect(codeRunes.has('cta')).toBe(false);
		expect(codeRunes.has('feature')).toBe(false);
	});

	it('includes hero/cta/feature in general mode', () => {
		const generalRunes = getChatModeRunes('general')!;
		expect(generalRunes.has('hero')).toBe(true);
		expect(generalRunes.has('cta')).toBe(true);
		expect(generalRunes.has('feature')).toBe(true);
	});

	it('includes hero/cta/feature in content mode', () => {
		const contentRunes = getChatModeRunes('content')!;
		expect(contentRunes.has('hero')).toBe(true);
		expect(contentRunes.has('cta')).toBe(true);
		expect(contentRunes.has('feature')).toBe(true);
	});

	it('includes hero/cta/feature in marketing mode', () => {
		const marketingRunes = getChatModeRunes('marketing')!;
		expect(marketingRunes.has('hero')).toBe(true);
		expect(marketingRunes.has('cta')).toBe(true);
		expect(marketingRunes.has('feature')).toBe(true);
	});
});
