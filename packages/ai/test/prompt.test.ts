import { describe, it, expect } from 'vitest';
import { generateSystemPrompt } from '../src/prompt.js';
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
		expect(prompt).toContain('fence → editor tab content');
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

	it('includes frontmatter instructions', () => {
		expect(prompt).toContain('frontmatter');
		expect(prompt).toContain('title: Page Title');
	});

	it('includes writing rules', () => {
		expect(prompt).toContain('Do NOT invent rune names');
		expect(prompt).toContain('Horizontal rules');
	});
});
