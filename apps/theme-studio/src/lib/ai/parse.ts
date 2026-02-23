import { tokens, getDefaults, type TokenDefinition } from '../tokens.js';

export interface ParsedTheme {
	light: Record<string, string>;
	dark: Record<string, string>;
}

export interface ParseResult {
	success: boolean;
	theme?: ParsedTheme;
	error?: string;
	warnings: string[];
}

/** Set of valid token names for fast lookup */
const VALID_NAMES = new Set(tokens.map(t => t.name));

/** Token lookup by name */
const TOKEN_MAP = new Map<string, TokenDefinition>(tokens.map(t => [t.name, t]));

/**
 * Extract JSON from potentially messy AI output.
 * Handles: raw JSON, ```json fences, preamble text before JSON,
 * trailing text after JSON, and truncated responses.
 */
export function extractJson(text: string): string | null {
	const trimmed = text.trim();
	console.log('[theme-studio] extractJson input length:', trimmed.length);
	console.log('[theme-studio] extractJson preview:', trimmed.slice(0, 200));

	// Strategy 1: Direct parse
	try {
		JSON.parse(trimmed);
		console.log('[theme-studio] Strategy 1 (direct parse) succeeded');
		return trimmed;
	} catch { /* continue */ }

	// Strategy 2a: Code fence extraction — non-greedy (```json ... ```)
	const fenceMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n\s*```/);
	if (fenceMatch) {
		try {
			JSON.parse(fenceMatch[1]);
			console.log('[theme-studio] Strategy 2a (code fence non-greedy) succeeded');
			return fenceMatch[1];
		} catch { /* continue */ }
	}

	// Strategy 2b: Code fence extraction — greedy (handles multiple fences or unusual formatting)
	const greedyFenceMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]*)```/);
	if (greedyFenceMatch) {
		const content = greedyFenceMatch[1].trim();
		try {
			JSON.parse(content);
			console.log('[theme-studio] Strategy 2b (code fence greedy) succeeded');
			return content;
		} catch { /* continue */ }
	}

	// Strategy 3: Find outermost braces
	const firstBrace = trimmed.indexOf('{');
	const lastBrace = trimmed.lastIndexOf('}');
	if (firstBrace !== -1 && lastBrace > firstBrace) {
		const candidate = trimmed.slice(firstBrace, lastBrace + 1);
		try {
			JSON.parse(candidate);
			console.log('[theme-studio] Strategy 3 (outermost braces) succeeded');
			return candidate;
		} catch { /* continue */ }
	}

	// Strategy 4: Try to repair truncated JSON (missing closing braces)
	if (firstBrace !== -1) {
		let candidate = trimmed.slice(firstBrace);
		// Count open vs close braces
		let depth = 0;
		for (const ch of candidate) {
			if (ch === '{') depth++;
			else if (ch === '}') depth--;
		}
		if (depth > 0) {
			// Truncated — try adding missing closing braces
			candidate = candidate + '}'.repeat(depth);
			try {
				JSON.parse(candidate);
				console.log('[theme-studio] Strategy 4 (brace repair, added', depth, 'closing braces) succeeded');
				return candidate;
			} catch { /* continue */ }
		}
	}

	console.warn('[theme-studio] All extraction strategies failed');
	console.warn('[theme-studio] Full response text:', trimmed);
	return null;
}

/** Basic sanity check that a value looks right for its token type */
function validateTokenValue(token: TokenDefinition, value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const v = value.trim();
	if (v.length === 0) return null;

	switch (token.type) {
		case 'color':
			if (/^(#|rgb|hsl|[a-z])/.test(v)) return v;
			return null;
		case 'font':
			return v;
		case 'size':
			if (/\d/.test(v) || v === '0') return v;
			return null;
		case 'shadow':
			if (v === 'none' || /\d/.test(v)) return v;
			return null;
	}
	return v;
}

/**
 * Validate a set of token values against the registry.
 * Returns valid tokens with defaults filled in for missing/invalid ones.
 */
function validateTokens(
	values: Record<string, unknown>,
	mode: 'light' | 'dark',
): { validated: Record<string, string>; warnings: string[] } {
	const defaults = getDefaults(mode);
	const validated: Record<string, string> = {};
	const warnings: string[] = [];

	for (const token of tokens) {
		const raw = values[token.name];
		const valid = validateTokenValue(token, raw);

		if (valid !== null) {
			validated[token.name] = valid;
		} else {
			validated[token.name] = defaults[token.name];
			if (raw !== undefined) {
				warnings.push(`${mode}/${token.name}: invalid value "${raw}", using default`);
			} else {
				warnings.push(`${mode}/${token.name}: missing, using default`);
			}
		}
	}

	return { validated, warnings };
}

/**
 * Parse and validate the complete AI response.
 * Falls back to defaults for any missing or invalid tokens.
 */
export function parseThemeResponse(text: string): ParseResult {
	const jsonStr = extractJson(text);
	if (!jsonStr) {
		return {
			success: false,
			error: 'Could not extract JSON from response',
			warnings: [],
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonStr);
	} catch {
		return {
			success: false,
			error: 'Invalid JSON in response',
			warnings: [],
		};
	}

	if (typeof parsed !== 'object' || parsed === null) {
		return {
			success: false,
			error: 'Response is not a JSON object',
			warnings: [],
		};
	}

	const obj = parsed as Record<string, unknown>;
	const warnings: string[] = [];

	// Handle missing light/dark keys
	let lightRaw = obj.light as Record<string, unknown> | undefined;
	let darkRaw = obj.dark as Record<string, unknown> | undefined;

	if (!lightRaw && !darkRaw) {
		// Maybe the AI returned a flat object — treat as light mode
		if (Object.keys(obj).some(k => VALID_NAMES.has(k))) {
			lightRaw = obj;
			darkRaw = obj;
			warnings.push('Response had no "light"/"dark" keys — treating as both modes');
		} else {
			return {
				success: false,
				error: 'Response missing "light" and "dark" keys',
				warnings: [],
			};
		}
	}

	if (!lightRaw) {
		lightRaw = darkRaw;
		warnings.push('No "light" key — copying from dark mode');
	}
	if (!darkRaw) {
		darkRaw = lightRaw;
		warnings.push('No "dark" key — copying from light mode');
	}

	const light = validateTokens(lightRaw!, 'light');
	const dark = validateTokens(darkRaw!, 'dark');

	return {
		success: true,
		theme: {
			light: light.validated,
			dark: dark.validated,
		},
		warnings: [...warnings, ...light.warnings, ...dark.warnings],
	};
}
