import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateStructureContract, toKebabCase } from '@refrakt-md/transform';
import type { RuneConfig, ThemeConfig } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import marketing from '@refrakt-md/marketing';
import docs from '@refrakt-md/docs';
import storytelling from '@refrakt-md/storytelling';
import places from '@refrakt-md/places';
import business from '@refrakt-md/business';
import design from '@refrakt-md/design';
import learning from '@refrakt-md/learning';
import media from '@refrakt-md/media';
import plan from '@refrakt-md/plan';

// ─── Assemble full config (core + all 9 official plugins) ───
// Must mirror the canonical generation (`refrakt contracts --site main`), which
// assembles every official rune-bearing plugin — including plan. Omitting a
// plugin here silently drops its runes from the contract guard (it was missing
// plan, which let the committed file drift).

const fullRunes: Record<string, RuneConfig> = {
	...baseConfig.runes,
	...marketing.theme?.runes as Record<string, RuneConfig>,
	...docs.theme?.runes as Record<string, RuneConfig>,
	...storytelling.theme?.runes as Record<string, RuneConfig>,
	...places.theme?.runes as Record<string, RuneConfig>,
	...business.theme?.runes as Record<string, RuneConfig>,
	...design.theme?.runes as Record<string, RuneConfig>,
	...learning.theme?.runes as Record<string, RuneConfig>,
	...media.theme?.runes as Record<string, RuneConfig>,
	...plan.theme?.runes as Record<string, RuneConfig>,
};

const fullConfig: ThemeConfig = { ...baseConfig, runes: fullRunes };

// The contract is committed in two places that must stay in lock-step: the
// repo-level dev copy (CLAUDE.md's `refrakt contracts -o contracts/...`) and the
// copy Lumina ships via its `./contracts` export. Guard both so neither drifts.
const CONTRACTS_PATH = join(__dirname, '..', 'contracts', 'structures.json');
const ROOT_CONTRACTS_PATH = join(__dirname, '..', '..', '..', 'contracts', 'structures.json');

describe('Structure contracts', () => {
	it('committed structures.json matches generated output', () => {
		const generated = generateStructureContract(fullConfig);
		const generatedJson = JSON.stringify(generated, null, '\t') + '\n';

		const committed = readFileSync(CONTRACTS_PATH, 'utf-8');

		expect(committed).toBe(generatedJson);
	});

	it('the repo-level contracts/structures.json stays in sync with Lumina\'s copy', () => {
		const generated = generateStructureContract(fullConfig);
		const generatedJson = JSON.stringify(generated, null, '\t') + '\n';

		expect(readFileSync(ROOT_CONTRACTS_PATH, 'utf-8')).toBe(generatedJson);
	});

	it('generates contracts for all runes in fullConfig', () => {
		const generated = generateStructureContract(fullConfig);
		const configRunes = Object.keys(fullConfig.runes).sort();
		const contractRunes = Object.keys(generated.runes).sort();

		expect(contractRunes).toEqual(configRunes);
	});

	it('every rune has required fields', () => {
		const generated = generateStructureContract(fullConfig);

		for (const [name, contract] of Object.entries(generated.runes)) {
			expect(contract.block, `${name}: missing block`).toBeTruthy();
			expect(contract.root, `${name}: missing root`).toMatch(/^\.rf-/);
			expect(contract.dataRune, `${name}: missing dataRune`).toBe(toKebabCase(name));
			expect(contract.childOrder, `${name}: missing childOrder`).toBeInstanceOf(Array);
			expect(contract.childOrder.length, `${name}: empty childOrder`).toBeGreaterThan(0);
		}
	});
});
