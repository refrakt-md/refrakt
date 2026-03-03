import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateStructureContract } from '@refrakt-md/transform';
import type { RuneConfig, ThemeConfig } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import marketing from '@refrakt/marketing';
import docs from '@refrakt/docs';
import storytelling from '@refrakt/storytelling';
import places from '@refrakt/places';
import business from '@refrakt/business';
import design from '@refrakt/design';
import learning from '@refrakt/learning';
import media from '@refrakt/media';

// ─── Assemble full config (core + all rune packages) ───

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
};

const fullConfig: ThemeConfig = { ...baseConfig, runes: fullRunes };

const CONTRACTS_PATH = join(__dirname, '..', 'contracts', 'structures.json');

describe('Structure contracts', () => {
	it('committed structures.json matches generated output', () => {
		const generated = generateStructureContract(fullConfig);
		const generatedJson = JSON.stringify(generated, null, '\t') + '\n';

		const committed = readFileSync(CONTRACTS_PATH, 'utf-8');

		expect(committed).toBe(generatedJson);
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
			expect(contract.dataRune, `${name}: missing dataRune`).toBe(name.toLowerCase());
			expect(contract.childOrder, `${name}: missing childOrder`).toBeInstanceOf(Array);
			expect(contract.childOrder.length, `${name}: empty childOrder`).toBeGreaterThan(0);
		}
	});
});
