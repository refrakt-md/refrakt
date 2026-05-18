import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Static description of the {@link TokenContract} tree, used by validation to
 * reject unknown keys with clear error messages.
 *
 * Each node is either:
 *   - a `Record<string, ContractNode>` of fixed children (a namespace)
 *   - the string `'leaf'` (a value)
 *   - the string `'leafRecord'` (an open-ended record of string values, used
 *     for the `extra` escape hatch)
 *
 * Kept in sync with `packages/types/src/token-contract.ts`.
 */
type ContractNode = 'leaf' | 'leafRecord' | { [k: string]: ContractNode };

const sentimentShape: ContractNode = {
	base: 'leaf',
	bg: 'leaf',
	border: 'leaf',
};

const TOKEN_CONTRACT_SHAPE: Record<string, ContractNode> = {
	font: {
		sans: 'leaf',
		mono: 'leaf',
	},
	color: {
		text: 'leaf',
		muted: 'leaf',
		border: 'leaf',
		bg: 'leaf',
		primary: 'leaf',
		'primary-hover': 'leaf',
		'primary-scale': {
			'50': 'leaf', '100': 'leaf', '200': 'leaf', '300': 'leaf', '400': 'leaf',
			'500': 'leaf', '600': 'leaf', '700': 'leaf', '800': 'leaf', '900': 'leaf',
			'950': 'leaf',
		},
		surface: {
			base: 'leaf', hover: 'leaf', active: 'leaf', raised: 'leaf',
		},
		info: sentimentShape,
		warning: sentimentShape,
		danger: sentimentShape,
		success: sentimentShape,
		code: {
			bg: 'leaf', text: 'leaf', 'inline-bg': 'leaf',
		},
	},
	radius: {
		sm: 'leaf', md: 'leaf', lg: 'leaf', full: 'leaf',
	},
	spacing: {
		xs: 'leaf', sm: 'leaf', md: 'leaf', lg: 'leaf', xl: 'leaf', '2xl': 'leaf',
		section: { base: 'leaf', tight: 'leaf', loose: 'leaf', breathe: 'leaf' },
	},
	inset: {
		flush: 'leaf', tight: 'leaf', loose: 'leaf', breathe: 'leaf',
	},
	shadow: {
		xs: 'leaf', sm: 'leaf', md: 'leaf', lg: 'leaf',
	},
	syntax: {
		keyword: 'leaf', function: 'leaf', string: 'leaf', number: 'leaf',
		type: 'leaf', comment: 'leaf', punctuation: 'leaf', variable: 'leaf',
	},
};

/** A single validation problem found in a config. */
export interface TokenValidationError {
	/** Dot-separated path from the config root (e.g. `'color.surface.base'`). */
	path: string;
	/** Human-readable description of the problem. */
	message: string;
}

export interface TokenValidationResult {
	valid: boolean;
	errors: TokenValidationError[];
}

/**
 * Validate a {@link ThemeTokensConfig}-shaped value at runtime. Walks the
 * config tree and rejects:
 *   - keys not present in the {@link TokenContract} shape (typos)
 *   - leaf positions that aren't strings (and aren't `null`/`undefined`)
 *   - namespace positions that aren't plain objects
 *
 * `extra` is treated as an open-ended `Record<string, string>` — any keys are
 * allowed but values must be strings.
 *
 * `modes` is treated as `Record<string, PartialTokenContract>` — keys are
 * mode names (free-form), values are validated against the contract shape.
 *
 * Returns the full list of errors. Adapters typically reject the build if
 * `valid` is false, surfacing all errors at once rather than failing on the
 * first.
 */
export function validateThemeTokensConfig(input: unknown): TokenValidationResult {
	const errors: TokenValidationError[] = [];

	if (!isPlainObject(input)) {
		errors.push({ path: '', message: 'theme.tokens must be a plain object' });
		return { valid: false, errors };
	}

	const { modes, extra, ...base } = input as Record<string, unknown>;

	walkConfig(base, '', TOKEN_CONTRACT_SHAPE, errors);

	if (modes !== undefined) {
		if (!isPlainObject(modes)) {
			errors.push({ path: 'modes', message: 'modes must be a plain object of <name> → PartialTokenContract' });
		} else {
			for (const [modeName, modeTokens] of Object.entries(modes)) {
				if (!isPlainObject(modeTokens)) {
					errors.push({
						path: `modes.${modeName}`,
						message: `modes.${modeName} must be a plain object`,
					});
					continue;
				}
				walkConfig(
					modeTokens as Record<string, unknown>,
					`modes.${modeName}`,
					TOKEN_CONTRACT_SHAPE,
					errors,
				);
			}
		}
	}

	if (extra !== undefined) {
		if (!isPlainObject(extra)) {
			errors.push({ path: 'extra', message: 'extra must be a plain object of string keys to string values' });
		} else {
			for (const [k, v] of Object.entries(extra)) {
				if (typeof v !== 'string') {
					errors.push({
						path: `extra.${k}`,
						message: `extra.${k} must be a string`,
					});
				}
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

function walkConfig(
	node: Record<string, unknown>,
	path: string,
	shape: ContractNode,
	errors: TokenValidationError[],
): void {
	if (shape === 'leaf' || shape === 'leafRecord') {
		// Shouldn't reach here at namespace-level; caller handles leaves.
		return;
	}
	for (const [key, value] of Object.entries(node)) {
		const childPath = path ? `${path}.${key}` : key;
		const childShape = shape[key];
		if (childShape === undefined) {
			errors.push({
				path: childPath,
				message: `unknown token key '${key}' at ${path || '<root>'}`,
			});
			continue;
		}
		if (childShape === 'leaf') {
			if (value !== null && value !== undefined && typeof value !== 'string') {
				errors.push({
					path: childPath,
					message: `${childPath} must be a string (got ${typeof value})`,
				});
			}
			continue;
		}
		// Namespace
		if (!isPlainObject(value)) {
			errors.push({
				path: childPath,
				message: `${childPath} must be a plain object`,
			});
			continue;
		}
		walkConfig(value as Record<string, unknown>, childPath, childShape, errors);
	}
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	if (v === null || typeof v !== 'object') return false;
	if (Array.isArray(v)) return false;
	const proto = Object.getPrototypeOf(v);
	return proto === Object.prototype || proto === null;
}

/**
 * Format a {@link TokenValidationResult} as a multi-line error message,
 * suitable for throwing or logging when the build pipeline rejects a config.
 */
export function formatTokenValidationErrors(result: TokenValidationResult): string {
	if (result.valid) return '';
	const lines = result.errors.map(e => `  - ${e.message}`);
	return `theme.tokens validation failed:\n${lines.join('\n')}`;
}

// Re-export for ergonomics — adapters that compose a pipeline often want
// both validation and the generator from one entry.
export type { ThemeTokensConfig };
