import { tokens, categoryLabels, getTokensByCategory, type TokenDefinition } from '../tokens.js';

/**
 * Build the stable base system prompt describing the token vocabulary
 * and design constraints. This part is cacheable (Anthropic prompt caching).
 */
export function buildBasePrompt(): string {
	const groups = getTokensByCategory();
	const tokenSections: string[] = [];

	for (const [category, defs] of groups) {
		const label = categoryLabels[category];
		const lines: string[] = [`### ${label} (${defs.length} tokens)`];
		for (const t of defs) {
			const parts = [`- \`${t.name}\` (${t.type}): ${t.description}. CSS: \`${t.cssVar}\``];
			parts.push(`Default: ${t.default.light}`);
			if (t.default.dark && t.default.dark !== t.default.light) {
				parts.push(`Dark: ${t.default.dark}`);
			}
			lines.push(parts.join('. '));
		}
		tokenSections.push(lines.join('\n'));
	}

	return `You are a theme designer for a documentation framework called refrakt.md.
Your job is to generate complete design token sets that produce visually cohesive, accessible themes.

## Token Vocabulary

The theme system has ${tokens.length} tokens organized into ${groups.size} categories.
Each token maps to a CSS custom property on :root.

${tokenSections.join('\n\n')}

## Design Constraints

1. **Monotonic primary scale**: The 11 primary-{50..950} tokens MUST form a monotonically darkening sequence from lightest (50) to darkest (950). Each step should be perceptibly darker than the previous.

2. **WCAG contrast**: color-text on color-bg must meet WCAG AA (4.5:1 ratio). color-muted on color-bg must meet at minimum 3:1. Semantic accent colors on their -bg backgrounds must meet 4.5:1.

3. **Surface hierarchy**: color-bg < color-surface < color-surface-hover < color-surface-active. Each should be a perceptible step in the same direction (lighter for light mode, darker for dark mode). color-surface-raised should be the lightest/brightest surface.

4. **Semantic color families**: Each semantic group (info, warning, danger, success) has an accent, -bg, and -border. The -bg should be a very subtle tint of the accent. The -border should be between accent and -bg in intensity.

5. **Dark mode**: Dark mode is NOT simply inverted light mode. It needs its own careful treatment:
   - Backgrounds are dark (typically #0c-#1e range)
   - Surfaces use subtle lightening (not white)
   - Accent colors are often lighter/brighter versions of their light counterparts
   - Semantic -bg colors should use rgba() with low opacity for translucency
   - Shadows need higher opacity in dark mode

6. **Code & syntax**: Code block backgrounds (color-code-bg) should be dark in BOTH modes (convention for developer tools). Syntax tokens should provide good contrast against color-code-bg.

7. **Radius consistency**: radius-sm < radius-md < radius-lg < radius-full. radius-full should always be 9999px.

8. **Shadow progression**: shadow-xs < shadow-sm < shadow-md < shadow-lg in perceived elevation. Dark mode shadows need higher opacity.

## Output Format

Respond with a JSON object containing "light" and "dark" keys.
Each key maps token names to string values.
Use ONLY the exact token names listed above.
Include ALL ${tokens.length} tokens in BOTH light and dark objects.
For tokens with no dark-mode variant (like fonts, radii), repeat the same value in both light and dark.

Do NOT include any text before or after the JSON.
Do NOT wrap the JSON in code fences.`;
}

/**
 * Build the context portion of the prompt.
 * For fresh generation: minimal output format reminder.
 * For refinement: includes current token values and override markers.
 */
export function buildContextPrompt(options?: {
	current?: { light: Record<string, string>; dark: Record<string, string> };
	overrides?: { light: Set<string>; dark: Set<string> };
}): string {
	if (!options?.current) {
		return `Generate a complete theme as a JSON object with "light" and "dark" keys, each containing all ${tokens.length} tokens.`;
	}

	const lines: string[] = [
		'## Current Theme State',
		'',
		'The user has an existing theme. Here are the current values:',
		'',
		'### Light Mode',
	];

	for (const t of tokens) {
		const value = options.current.light[t.name] ?? t.default.light;
		const marker = options.overrides?.light.has(t.name) ? ' [USER EDITED]' : '';
		lines.push(`${t.name}: ${value}${marker}`);
	}

	lines.push('', '### Dark Mode');
	for (const t of tokens) {
		const value = options.current.dark[t.name] ?? (t.default.dark ?? t.default.light);
		const marker = options.overrides?.dark.has(t.name) ? ' [USER EDITED]' : '';
		lines.push(`${t.name}: ${value}${marker}`);
	}

	const editedLight = options.overrides?.light.size ?? 0;
	const editedDark = options.overrides?.dark.size ?? 0;
	if (editedLight + editedDark > 0) {
		lines.push('', '### Preservation Rule');
		lines.push('Tokens marked [USER EDITED] were manually set by the user.');
		lines.push('Preserve their exact values unless the user explicitly asks to change them.');
	}

	lines.push('', 'Adjust the theme according to the user\'s request while maintaining all design constraints and keeping the theme cohesive.');
	lines.push(`Respond with a JSON object with "light" and "dark" keys, each containing all ${tokens.length} tokens.`);

	return lines.join('\n');
}

/**
 * Convenience: returns [basePrompt, contextPrompt] for the SSE endpoint.
 */
export function buildThemePromptParts(options?: {
	current?: { light: Record<string, string>; dark: Record<string, string> };
	overrides?: { light: Set<string>; dark: Set<string> };
}): [string, string] {
	return [buildBasePrompt(), buildContextPrompt(options)];
}
