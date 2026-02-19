import { describe, it, expect } from 'vitest';
import { generateSystemPrompt, generateSystemPromptParts } from '../src/prompt.js';
import { getChatModeRunes } from '../src/modes/chat.js';
import { runes } from '@refrakt-md/runes';

describe('generateSystemPrompt', () => {
	const prompt = generateSystemPrompt(runes);

	it('includes top-level rune names as headings', () => {
		expect(prompt).toContain('### hint');
		expect(prompt).toContain('### cta');
		expect(prompt).toContain('### feature');
		expect(prompt).toContain('### grid');
		expect(prompt).toContain('### steps');
		expect(prompt).toContain('### tabs');
		expect(prompt).toContain('### codegroup');
		expect(prompt).toContain('### pricing');
		expect(prompt).toContain('### nav');
	});

	it('includes rune descriptions', () => {
		expect(prompt).toContain('Callout/admonition block');
		expect(prompt).toContain('Call-to-action section');
		expect(prompt).toContain('Sequential step-by-step instructions');
	});

	it('includes aliases', () => {
		expect(prompt).toContain('Aliases: callout, alert');
		expect(prompt).toContain('Aliases: call-to-action');
		expect(prompt).toContain('Aliases: columns');
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

	it('includes reinterprets', () => {
		expect(prompt).toContain('paragraph → message body');
		expect(prompt).toContain('heading → section headline');
		expect(prompt).toContain('fence → tab content');
	});

	it('includes examples with rune syntax', () => {
		expect(prompt).toContain('{% hint type="note" %}');
		expect(prompt).toContain('{% cta %}');
		expect(prompt).toContain('{% /cta %}');
		expect(prompt).toContain('{% grid %}');
		expect(prompt).toContain('{% steps %}');
	});

	it('excludes child-only runes', () => {
		// These should NOT appear as section headings
		expect(prompt).not.toMatch(/^### error$/m);
		expect(prompt).not.toMatch(/^### definition$/m);
		expect(prompt).not.toMatch(/^### step$/m);
		expect(prompt).not.toMatch(/^### tab$/m);
		expect(prompt).not.toMatch(/^### music-recording$/m);
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
