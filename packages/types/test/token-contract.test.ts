import { describe, it, expectTypeOf } from 'vitest';
import type {
	TokenContract,
	PartialTokenContract,
	ThemeTokensConfig,
	SentimentTokens,
	SyntaxTokens,
} from '../src/token-contract.js';

describe('TokenContract', () => {
	it('accepts a fully-populated contract', () => {
		const fullContract: TokenContract = {
			font: {
				sans: "'Inter', system-ui, sans-serif",
				mono: "'JetBrains Mono', ui-monospace, monospace",
			},
			color: {
				text: '#1c1a17',
				muted: '#6b6661',
				border: '#e8e5df',
				bg: '#f6f4ef',
				primary: '#1c1a17',
				'primary-hover': '#3a342d',
				'primary-bg': 'color-mix(in oklch, var(--rf-color-primary) 10%, transparent)',
				'on-primary': '#ffffff',
				surface: {
					base: '#fcfaf6',
					hover: '#efece5',
					active: '#e8e5df',
					raised: '#ffffff',
				},
				info: { base: '#34547a', bg: '#e8edf4', border: '#c5d2e0' },
				warning: { base: '#9c5a18', bg: '#f5ebd9', border: '#e0c9a3' },
				danger: { base: '#a83232', bg: '#f5e0e0', border: '#e0b8b8' },
				success: { base: '#2d6a3e', bg: '#e0eee4', border: '#b8d4be' },
				code: {
					bg: '#ebeae8',
					text: '#1c1a17',
					'inline-bg': '#e6e5e3',
				},
			},
			radius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
			spacing: {
				xs: '0.25rem',
				sm: '0.5rem',
				md: '1rem',
				lg: '1.5rem',
				xl: '2rem',
				'2xl': '3rem',
				section: {
					base: '4rem',
					tight: '2rem',
					loose: '6rem',
					breathe: '8rem',
				},
			},
			inset: {
				flush: '0',
				tight: '1rem',
				loose: '4rem',
				breathe: '8rem',
			},
			shadow: {
				xs: '0 1px 2px rgba(0,0,0,0.04)',
				sm: '0 1px 3px rgba(0,0,0,0.06)',
				md: '0 4px 12px rgba(0,0,0,0.07)',
				lg: '0 8px 24px rgba(0,0,0,0.08)',
			},
			syntax: {
				keyword: '#2a5c63',
				function: '#4a3b6e',
				string: '#8a3a3a',
				number: '#876327',
				type: '#3a5c2a',
				comment: '#8a857d',
				punctuation: '#6b6661',
				variable: '#1c1a17',
			},
		};
		expectTypeOf(fullContract).toMatchTypeOf<TokenContract>();
	});

	it('rejects missing required fields on the full contract', () => {
		// @ts-expect-error — missing required `font.mono`
		const missingMono: TokenContract = {
			font: { sans: "'Inter', sans-serif" },
			color: {} as TokenContract['color'],
			radius: {} as TokenContract['radius'],
			spacing: {} as TokenContract['spacing'],
			inset: {} as TokenContract['inset'],
			shadow: {} as TokenContract['shadow'],
			syntax: {} as TokenContract['syntax'],
		};
		expectTypeOf(missingMono).toBeAny();
	});
});

describe('PartialTokenContract', () => {
	it('accepts an empty object', () => {
		const empty: PartialTokenContract = {};
		expectTypeOf(empty).toMatchTypeOf<PartialTokenContract>();
	});

	it('accepts a single-leaf override', () => {
		const oneLeaf: PartialTokenContract = {
			color: { primary: '#ff0000' },
		};
		expectTypeOf(oneLeaf).toMatchTypeOf<PartialTokenContract>();
	});

	it('accepts a single-namespace override leaving siblings absent', () => {
		const sentimentOnly: PartialTokenContract = {
			color: {
				danger: { base: '#a83232' },
			},
		};
		expectTypeOf(sentimentOnly).toMatchTypeOf<PartialTokenContract>();
	});

	it('accepts a syntax-only override (the niwaki shape)', () => {
		const syntaxOnly: PartialTokenContract = {
			syntax: {
				keyword: '#2d5230',
				function: '#b35070',
				string: '#c4501c',
			},
		};
		expectTypeOf(syntaxOnly).toMatchTypeOf<PartialTokenContract>();
	});

	it('rejects unknown leaves', () => {
		// @ts-expect-error — `nonsense` not a TokenContract namespace
		const badLeaf: PartialTokenContract = { nonsense: 'x' };
		expectTypeOf(badLeaf).toBeAny();
	});
});

describe('ThemeTokensConfig', () => {
	it('accepts a config with base, modes, and extra', () => {
		const full: ThemeTokensConfig = {
			color: { primary: '#7c3aed' },
			modes: {
				dark: {
					color: { primary: '#a78bfa' },
				},
			},
			extra: {
				'rf-hero-overlay': 'rgba(15, 23, 42, 0.6)',
			},
		};
		expectTypeOf(full).toMatchTypeOf<ThemeTokensConfig>();
	});

	it('accepts a syntax-only preset shape (niwaki)', () => {
		const niwaki: ThemeTokensConfig = {
			syntax: {
				keyword: '#2d5230',
				function: '#b35070',
				string: '#c4501c',
				number: '#9c721a',
				type: '#6b8a35',
				comment: '#7d7062',
				punctuation: '#8a7c6e',
			},
			modes: {
				dark: {
					syntax: {
						keyword: '#8ab589',
						function: '#e89db0',
						string: '#e87a3a',
						number: '#d4a85a',
						type: '#b4c97a',
						comment: '#7d7062',
						punctuation: '#7d7062',
					},
				},
			},
		};
		expectTypeOf(niwaki).toMatchTypeOf<ThemeTokensConfig>();
	});

	it('accepts an empty config', () => {
		const empty: ThemeTokensConfig = {};
		expectTypeOf(empty).toMatchTypeOf<ThemeTokensConfig>();
	});
});

describe('SentimentTokens', () => {
	it('requires base, bg, border', () => {
		const sentiment: SentimentTokens = {
			base: '#34547a',
			bg: '#e8edf4',
			border: '#c5d2e0',
		};
		expectTypeOf(sentiment).toMatchTypeOf<SentimentTokens>();
	});
});

describe('SyntaxTokens', () => {
	it('requires every role', () => {
		const tokens: SyntaxTokens = {
			keyword: '#2a5c63',
			function: '#4a3b6e',
			string: '#8a3a3a',
			number: '#876327',
			type: '#3a5c2a',
			comment: '#8a857d',
			punctuation: '#6b6661',
			variable: '#1c1a17',
		};
		expectTypeOf(tokens).toMatchTypeOf<SyntaxTokens>();
	});
});
