import { describe, it, expect } from 'vitest';
import { resolveTintExtends } from '../src/merge.js';
import type { TintDefinition } from '../src/types.js';

describe('resolveTintExtends', () => {
	it('passes through tints without `extends`', () => {
		const tints: Record<string, TintDefinition> = {
			warm: {
				light: { bg: '#fef3c7', text: '#1c1a17' },
				dark: { bg: '#2a2018', text: '#f6f4ef' },
			},
		};
		const resolved = resolveTintExtends(tints);
		expect(resolved.warm).toEqual(tints.warm);
		expect(resolved.warm.extends).toBeUndefined();
	});

	it('expands a single-level extends and layers overrides per leaf', () => {
		const tints: Record<string, TintDefinition> = {
			warm: {
				light: { bg: '#fef3c7', text: '#1c1a17', primary: '#9c5a18' },
			},
			'warm-strong': {
				extends: 'warm',
				light: { primary: '#7c3aed' },
			},
		};
		const resolved = resolveTintExtends(tints);
		expect(resolved['warm-strong'].light).toEqual({
			bg: '#fef3c7',
			text: '#1c1a17',
			primary: '#7c3aed',
		});
		// The base tint itself is untouched.
		expect(resolved.warm.light?.primary).toBe('#9c5a18');
	});

	it('inherits dark variant from the base when not overridden', () => {
		const tints: Record<string, TintDefinition> = {
			warm: {
				light: { bg: '#fef3c7' },
				dark: { bg: '#2a2018' },
			},
			tideline: {
				extends: 'warm',
				light: { primary: '#1d3557' },
			},
		};
		const resolved = resolveTintExtends(tints);
		expect(resolved.tideline.dark).toEqual({ bg: '#2a2018' });
	});

	it('inherits lockMode from the base when not overridden', () => {
		const tints: Record<string, TintDefinition> = {
			'always-dark': { lockMode: 'dark', dark: { bg: '#000' } },
			alias: { extends: 'always-dark' },
		};
		const resolved = resolveTintExtends(tints);
		expect(resolved.alias.lockMode).toBe('dark');
	});

	it('overrides lockMode when the child specifies one', () => {
		const tints: Record<string, TintDefinition> = {
			'always-dark': { lockMode: 'dark', dark: { bg: '#000' } },
			'force-light': { extends: 'always-dark', lockMode: 'light', light: { bg: '#fff' } },
		};
		const resolved = resolveTintExtends(tints);
		expect(resolved['force-light'].lockMode).toBe('light');
		expect(resolved['force-light'].light).toEqual({ bg: '#fff' });
		expect(resolved['force-light'].dark).toEqual({ bg: '#000' });
	});

	it('resolves multi-level extends chains', () => {
		const tints: Record<string, TintDefinition> = {
			grandparent: { light: { bg: '#aaa', text: '#111' } },
			parent: { extends: 'grandparent', light: { text: '#222' } },
			child: { extends: 'parent', light: { primary: '#333' } },
		};
		const resolved = resolveTintExtends(tints);
		expect(resolved.child.light).toEqual({ bg: '#aaa', text: '#222', primary: '#333' });
	});

	it('rejects unknown base tint with a clear error', () => {
		const tints: Record<string, TintDefinition> = {
			child: { extends: 'nonexistent', light: { bg: '#fff' } },
		};
		expect(() => resolveTintExtends(tints)).toThrow(/extends unknown tint/);
	});

	it('rejects circular extends chains with a chain trace', () => {
		const tints: Record<string, TintDefinition> = {
			a: { extends: 'b' },
			b: { extends: 'c' },
			c: { extends: 'a' },
		};
		expect(() => resolveTintExtends(tints)).toThrow(/Circular tint extends chain/);
	});

	it('rejects a direct self-reference', () => {
		const tints: Record<string, TintDefinition> = {
			loop: { extends: 'loop', light: { bg: '#fff' } },
		};
		expect(() => resolveTintExtends(tints)).toThrow(/Circular tint extends chain/);
	});

	it('preserves the resolved object for repeated lookups (no infinite recursion on diamond chains)', () => {
		const tints: Record<string, TintDefinition> = {
			root: { light: { bg: '#aaa' } },
			left: { extends: 'root', light: { text: '#111' } },
			right: { extends: 'root', light: { primary: '#222' } },
		};
		const resolved = resolveTintExtends(tints);
		expect(resolved.left.light).toEqual({ bg: '#aaa', text: '#111' });
		expect(resolved.right.light).toEqual({ bg: '#aaa', primary: '#222' });
	});

	// ── SPEC-056: preset-path extends ────────────────────────────────────

	it('SPEC-056: extends a preset module path, projecting chrome accents into TintTokens', () => {
		const presetMap = {
			'@example/preset-warm': {
				color: {
					bg: '#fef3c7',
					text: '#1c1a17',
					primary: '#9c5a18',
					muted: '#9b9692',
				},
				modes: {
					dark: {
						color: {
							bg: '#2a2018',
							text: '#f6f4ef',
							primary: '#d4a85a',
						},
					},
				},
			},
		};
		const tints: Record<string, TintDefinition> = {
			warm: { extends: '@example/preset-warm' },
		};
		const resolved = resolveTintExtends(tints, presetMap);
		expect(resolved.warm.light).toEqual({
			bg: '#fef3c7',
			text: '#1c1a17',
			primary: '#9c5a18',
			muted: '#9b9692',
		});
		expect(resolved.warm.dark).toEqual({
			bg: '#2a2018',
			text: '#f6f4ef',
			primary: '#d4a85a',
		});
	});

	it('SPEC-056: preset-path extends layers inline light/dark overrides on top of the projection', () => {
		const presetMap = {
			'@example/preset-warm': {
				color: { bg: '#fef3c7', text: '#1c1a17', primary: '#9c5a18' },
			},
		};
		const tints: Record<string, TintDefinition> = {
			'warm-custom': {
				extends: '@example/preset-warm',
				light: { bg: '#ffeeaa', border: '#cccccc' },
			},
		};
		const resolved = resolveTintExtends(tints, presetMap);
		// bg override wins, text inherits from preset, border is purely inline
		expect(resolved['warm-custom'].light).toEqual({
			bg: '#ffeeaa',
			text: '#1c1a17',
			primary: '#9c5a18',
			border: '#cccccc',
		});
	});

	it('SPEC-056: preset extends with no chrome accents (Nord-shape: syntax-only + code-surface) projects empty TintTokens', () => {
		const presetMap = {
			'@example/nord': {
				color: {
					code: { bg: '#2e3440', text: '#d8dee9' },
				},
				syntax: { keyword: '#81a1c1', function: '#88c0d0', type: '#8fbcbb' },
			},
		};
		const tints: Record<string, TintDefinition> = {
			nord: { extends: '@example/nord' },
		};
		const resolved = resolveTintExtends(tints, presetMap as any);
		// Nord doesn't set chrome accents — only code.* and syntax.*. The
		// chrome accent projection yields undefined; syntax + code-surface
		// take the separate `generateScopedTintStylesheet` path instead.
		expect(resolved.nord.light).toBeUndefined();
		expect(resolved.nord.dark).toBeUndefined();
	});

	it('SPEC-056: preset path takes precedence over a tint name if both resolve', () => {
		const presetMap = {
			'@example/preset-warm': {
				color: { bg: '#abc123' },
			},
		};
		const tints: Record<string, TintDefinition> = {
			// Defines a tint *and* a preset path with the same string would be
			// nonsensical, but if a name collision were to happen, presets win.
			'@example/preset-warm': { light: { bg: '#deadbeef' } },
			usingPreset: { extends: '@example/preset-warm' },
		};
		const resolved = resolveTintExtends(tints, presetMap);
		// Preset value (#abc123) wins, not the tint's #deadbeef.
		expect(resolved.usingPreset.light?.bg).toBe('#abc123');
	});

	it('SPEC-056: falls back to tint-name lookup when extends value is not in presetMap', () => {
		const presetMap = {
			'@example/preset-foo': { color: { bg: '#ffffff' } },
		};
		const tints: Record<string, TintDefinition> = {
			base: { light: { bg: '#aaa' } },
			child: { extends: 'base', light: { text: '#111' } },
		};
		const resolved = resolveTintExtends(tints, presetMap);
		// 'base' is not in presetMap, so falls back to tint-name lookup.
		expect(resolved.child.light).toEqual({ bg: '#aaa', text: '#111' });
	});
});
