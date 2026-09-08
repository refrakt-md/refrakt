import { describe, it, expect } from 'vitest';
import { assembleThemeConfig, mergeThemeConfig, type IdentityViolation, type RuneConfig } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import { luminaOverrides } from '../src/config.js';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// ADR-028 / SPEC-125 Phase 2 — the identity guard is expected to be a *no-op*
// against everything this repo ships. If it ever isn't, that is either a theme
// reaching past its remit or a plugin whose rune name collides with a core
// rune's — both worth failing a build over, and neither detectable before now.

const plugins = { marketing, docs, storytelling, places, business, design, learning, media, plan };

describe('ADR-028 identity guard — shipped configs', () => {
	it('Lumina trips no identity violation', () => {
		const violations: IdentityViolation[] = [];
		mergeThemeConfig(baseConfig, luminaOverrides, undefined, (v) => violations.push(v));
		expect(violations).toEqual([]);
	});

	for (const [name, plugin] of Object.entries(plugins)) {
		it(`@refrakt-md/${name} trips no identity violation`, () => {
			const violations: IdentityViolation[] = [];
			mergeThemeConfig(
				baseConfig,
				{ runes: plugin.theme?.runes as Record<string, RuneConfig> },
				undefined,
				(v) => violations.push(v),
			);
			expect(violations).toEqual([]);
		});
	}

	it('the full assembly — core + all nine plugins + Lumina — is clean', () => {
		const violations: IdentityViolation[] = [];
		const pluginRunes: Record<string, RuneConfig> = {};
		for (const plugin of Object.values(plugins)) {
			Object.assign(pluginRunes, plugin.theme?.runes as Record<string, RuneConfig>);
		}

		// Mirrors assembleThemeConfig's merge order without its console reporter:
		// core → plugin runes → theme overrides.
		let config = mergeThemeConfig(baseConfig, { runes: pluginRunes }, undefined, (v) => violations.push(v));
		config = mergeThemeConfig(config, luminaOverrides, undefined, (v) => violations.push(v));

		expect(violations).toEqual([]);

		// And the real entry point produces the same rune set, so the mirror above
		// is not testing a path nobody uses.
		const assembled = assembleThemeConfig({
			coreConfig: baseConfig,
			pluginRunes,
			themeOverrides: luminaOverrides,
		});
		expect(Object.keys(assembled.config.runes).sort()).toEqual(Object.keys(config.runes).sort());
	});
});
