import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ThemeTokensConfig } from '@refrakt-md/types';
import type { TintDefinition } from '../src/types.js';
import { generateScopedTintStylesheet } from '../src/token-stylesheet.js';

describe('generateScopedTintStylesheet — SPEC-056 preset projection', () => {
	// Suppress dev warnings emitted by the generator during tests in this
	// suite — they're noise, not signal. The "dev-mode dropped-key warning"
	// describe below uses its own spy when asserting warning behaviour.
	let suppressWarn: ReturnType<typeof vi.spyOn>;
	beforeEach(() => {
		suppressWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => {
		suppressWarn.mockRestore();
	});

	it('emits scope-eligible non-accent CSS for a tint extending a preset module', () => {
		const presetMap: Record<string, ThemeTokensConfig> = {
			'@refrakt-md/lumina/presets/nord': {
				color: {
					code: { bg: '#eceff4', text: '#2e3440', 'inline-bg': '#e5e9f0' },
				},
				syntax: {
					keyword: '#5e81ac',
					function: '#88c0d0',
					type: '#8fbcbb',
					string: '#a3be8c',
					constant: '#b48ead',
					comment: '#4c566a',
					punctuation: '#4c566a',
					variable: '#2e3440',
				},
				modes: {
					dark: {
						color: {
							code: { bg: '#2e3440', text: '#d8dee9' },
						},
						syntax: {
							keyword: '#81a1c1',
							function: '#88c0d0',
							type: '#8fbcbb',
						},
					},
				},
			},
		};
		const tints: Record<string, TintDefinition> = {
			nord: { extends: '@refrakt-md/lumina/presets/nord' },
		};
		const css = generateScopedTintStylesheet(tints, presetMap);

		// Light block — selector + content
		expect(css).toContain('[data-tint="nord"] {');
		expect(css).toContain('--rf-syntax-keyword: #5e81ac;');
		expect(css).toContain('--rf-syntax-token-keyword: #5e81ac;');
		expect(css).toContain('--rf-syntax-type: #8fbcbb;');
		expect(css).toContain('--rf-syntax-token-type: #8fbcbb;');
		expect(css).toContain('--rf-color-code-bg: #eceff4;');
		expect(css).toContain('--rf-color-code-text: #2e3440;');

		// Dark block — paired selector for forced-scheme + page-scheme
		expect(css).toContain('[data-tint="nord"][data-color-scheme="dark"], [data-color-scheme="dark"] [data-tint="nord"] {');
		expect(css).toContain('--rf-syntax-token-keyword: #81a1c1;');
		expect(css).toContain('--rf-color-code-bg: #2e3440;');
	});

	it('drops non-scope-eligible namespaces (typography, spacing, radius, status)', () => {
		const presetMap: Record<string, ThemeTokensConfig> = {
			'@example/loud-preset': {
				font: { sans: 'Comic Sans, cursive', mono: 'monospace' },
				radius: { md: '20px', sm: '6px', lg: '32px', full: '9999px' },
				spacing: {
					xs: '2px', sm: '4px', md: '8px', lg: '16px', xl: '32px', '2xl': '64px',
					section: { base: '64px', tight: '32px', loose: '128px', breathe: '256px' },
				},
				shadow: { xs: '0 1px 2px #000', sm: '0 2px 4px #000', md: '0 4px 8px #000', lg: '0 8px 16px #000' },
				color: {
					info: { base: '#0af', bg: '#e0f5ff', border: '#5ac' },
				},
				syntax: { keyword: '#abc' } as any,
			},
		};
		const tints: Record<string, TintDefinition> = {
			loud: { extends: '@example/loud-preset' },
		};
		const css = generateScopedTintStylesheet(tints, presetMap);

		// Only syntax is in the eligible set (since loud-preset doesn't set color.code).
		expect(css).toContain('--rf-syntax-keyword: #abc;');

		// Excluded namespaces must NOT appear
		expect(css).not.toContain('--rf-font-sans');
		expect(css).not.toContain('Comic Sans');
		expect(css).not.toContain('--rf-radius');
		expect(css).not.toContain('--rf-spacing');
		expect(css).not.toContain('--rf-shadow');
		expect(css).not.toContain('--rf-color-info');
	});

	it('emits nothing for tints whose extends is a tint name (not a preset path)', () => {
		const presetMap: Record<string, ThemeTokensConfig> = {};
		const tints: Record<string, TintDefinition> = {
			base: { light: { bg: '#aaa' } },
			child: { extends: 'base', light: { text: '#111' } },
		};
		// `base` is not in presetMap, so `child.extends` falls into the
		// tint-name path — generator emits nothing for child here.
		const css = generateScopedTintStylesheet(tints, presetMap);
		expect(css).toBe('');
	});

	it('emits nothing for tints with no extends', () => {
		const presetMap: Record<string, ThemeTokensConfig> = {};
		const tints: Record<string, TintDefinition> = {
			warm: { light: { bg: '#fef3c7' } },
		};
		const css = generateScopedTintStylesheet(tints, presetMap);
		expect(css).toBe('');
	});

	it('emits no dark block when the preset has no dark mode overlay', () => {
		const presetMap: Record<string, ThemeTokensConfig> = {
			'@example/light-only': {
				syntax: { keyword: '#abc' } as any,
				// No modes.dark
			},
		};
		const tints: Record<string, TintDefinition> = {
			lt: { extends: '@example/light-only' },
		};
		const css = generateScopedTintStylesheet(tints, presetMap);
		expect(css).toContain('[data-tint="lt"] {');
		expect(css).not.toContain('[data-color-scheme="dark"]');
	});

	it('emits the same selectors as the engine already produces for data-tint', () => {
		// SPEC-056 invariant: the selector emitted here ([data-tint="<name>"])
		// must match what packages/transform/src/engine.ts sets on the tint
		// wrapper element. This test pins the selector contract.
		const presetMap: Record<string, ThemeTokensConfig> = {
			'@example/preset': { syntax: { keyword: '#abc' } as any },
		};
		const tints: Record<string, TintDefinition> = {
			myTint: { extends: '@example/preset' },
		};
		const css = generateScopedTintStylesheet(tints, presetMap);
		expect(css).toMatch(/\[data-tint="myTint"\] \{/);
	});

	describe('dev-mode dropped-key warning', () => {
		let warnSpy: ReturnType<typeof vi.spyOn>;
		let originalEnv: string | undefined;

		beforeEach(() => {
			originalEnv = process.env.NODE_ENV;
			delete process.env.NODE_ENV; // dev = NODE_ENV !== 'production', so undefined counts as dev
			warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		});

		afterEach(() => {
			warnSpy.mockRestore();
			if (originalEnv !== undefined) process.env.NODE_ENV = originalEnv;
		});

		it('warns once per dropped key with the preset and key name', () => {
			const presetMap: Record<string, ThemeTokensConfig> = {
				'@example/typed-preset': {
					font: { sans: 'Inter', mono: 'monospace' },
					radius: { md: '8px', sm: '4px', lg: '12px', full: '9999px' },
					syntax: { keyword: '#abc' } as any,
				},
			};
			const tints: Record<string, TintDefinition> = {
				t: { extends: '@example/typed-preset' },
			};
			generateScopedTintStylesheet(tints, presetMap);
			// Should have warned about both font and radius being dropped
			expect(warnSpy).toHaveBeenCalled();
			const allWarnings = warnSpy.mock.calls.map(c => c[0]).join('\n');
			expect(allWarnings).toMatch(/font/);
			expect(allWarnings).toMatch(/radius/);
			expect(allWarnings).toMatch(/@example\/typed-preset/);
		});

		it('is silent in production (NODE_ENV=production)', () => {
			process.env.NODE_ENV = 'production';
			const presetMap: Record<string, ThemeTokensConfig> = {
				'@example/typed-preset': {
					font: { sans: 'Inter', mono: 'monospace' },
					syntax: { keyword: '#abc' } as any,
				},
			};
			const tints: Record<string, TintDefinition> = {
				t: { extends: '@example/typed-preset' },
			};
			generateScopedTintStylesheet(tints, presetMap);
			expect(warnSpy).not.toHaveBeenCalled();
		});
	});
});
