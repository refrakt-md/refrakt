import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateStructureContract } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/theme-base';

const CONTRACTS_PATH = join(__dirname, '..', 'contracts', 'structures.json');

describe('Structure contracts', () => {
	it('committed structures.json matches generated output', () => {
		const generated = generateStructureContract(baseConfig);
		const generatedJson = JSON.stringify(generated, null, '\t') + '\n';

		const committed = readFileSync(CONTRACTS_PATH, 'utf-8');

		expect(committed).toBe(generatedJson);
	});

	it('generates contracts for all runes in baseConfig', () => {
		const generated = generateStructureContract(baseConfig);
		const configRunes = Object.keys(baseConfig.runes).sort();
		const contractRunes = Object.keys(generated.runes).sort();

		expect(contractRunes).toEqual(configRunes);
	});

	it('every rune has required fields', () => {
		const generated = generateStructureContract(baseConfig);

		for (const [name, contract] of Object.entries(generated.runes)) {
			expect(contract.block, `${name}: missing block`).toBeTruthy();
			expect(contract.root, `${name}: missing root`).toMatch(/^\.rf-/);
			expect(contract.dataRune, `${name}: missing dataRune`).toBe(name.toLowerCase());
			expect(contract.childOrder, `${name}: missing childOrder`).toBeInstanceOf(Array);
			expect(contract.childOrder.length, `${name}: empty childOrder`).toBeGreaterThan(0);
		}
	});
});
