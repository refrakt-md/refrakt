import { formatContractForPrompt, type RuneContract } from '../contracts.js';
import { tokens } from '../tokens.js';

/**
 * Build system prompt parts for per-rune CSS generation.
 * Returns [basePrompt, contextPrompt] — base is cacheable, context varies per request.
 */
export function buildCssPromptParts(
	runeName: string,
	contract: RuneContract,
	currentTokens: Record<string, string>,
	existingCss?: string,
): [string, string] {
	const base = `You are a CSS specialist for a documentation framework called refrakt.md.
Your job is to generate CSS overrides for specific rune components.

## How Rune CSS Works

Each rune has a BEM-based CSS structure:
- Block: .rf-{block} — the root element
- Modifiers: .rf-{block}--{variant} — state/variant classes
- Elements: .rf-{block}__{element} — sub-elements

The rune CSS uses CSS custom properties (design tokens) prefixed with --rf-.
Your CSS should use these tokens via var(--rf-*) to stay cohesive with the theme.

## Available Token Variables

Common tokens you can reference:
  var(--rf-color-text)          — main text color
  var(--rf-color-muted)         — secondary text
  var(--rf-color-border)        — border color
  var(--rf-color-bg)            — page background
  var(--rf-color-primary)       — primary accent
  var(--rf-color-surface)       — card/surface background
  var(--rf-color-surface-raised) — elevated surface
  var(--rf-radius-sm/md/lg)     — border radii
  var(--rf-shadow-xs/sm/md/lg)  — box shadows
  var(--rf-font-sans)           — sans-serif font stack
  var(--rf-font-mono)           — monospace font stack

## Guidelines

1. ONLY use selectors from the contract provided — do not invent selectors
2. Use var(--rf-*) token references for colors, fonts, radii, and shadows
3. Do NOT redefine token values — override component-level styles only
4. Keep specificity reasonable — use the BEM selectors, avoid !important
5. For dark mode, use [data-theme="dark"] .rf-{block} { ... } or prefers-color-scheme

## Output Format

Respond with ONLY valid CSS. No explanations, no markdown fences, no comments about what you did.
Start directly with the CSS rules.`;

	// Context prompt with contract + current tokens
	const lines: string[] = [];
	lines.push(`## Target Rune: ${runeName}\n`);
	lines.push('### Selector Contract');
	lines.push(formatContractForPrompt(contract));
	lines.push('');

	// Include key token values so AI knows current theme palette
	lines.push('### Current Theme Tokens');
	for (const t of tokens) {
		const val = currentTokens[t.name];
		if (val) {
			const cssVar = t.name.startsWith('shiki-') ? `--${t.name}` : `--rf-${t.name}`;
			lines.push(`  ${cssVar}: ${val};`);
		}
	}

	if (existingCss?.trim()) {
		lines.push('');
		lines.push('### Existing CSS (modify or extend as requested)');
		lines.push(existingCss);
	}

	return [base, lines.join('\n')];
}
