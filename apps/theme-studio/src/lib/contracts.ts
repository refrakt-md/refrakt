import contractData from './contracts.json';
import type { StructureContract, RuneContract } from '@refrakt-md/transform';

export type { RuneContract };

export const contracts = contractData as unknown as StructureContract;

/** All rune typeof names sorted alphabetically */
export function getRuneNames(): string[] {
	return Object.keys(contracts.runes).sort();
}

/** Get a rune's contract by typeof name (e.g., 'Hint') */
export function getRuneContract(name: string): RuneContract | undefined {
	return contracts.runes[name];
}

/** Get a rune contract by block name (e.g., 'hint') */
export function getRuneContractByBlock(block: string): { name: string; contract: RuneContract } | undefined {
	for (const [name, contract] of Object.entries(contracts.runes)) {
		if (contract.block === block) return { name, contract };
	}
	return undefined;
}

/** Format a contract as a selector reference for AI prompts */
export function formatContractForPrompt(contract: RuneContract): string {
	const lines: string[] = [];
	lines.push(`Root: ${contract.root}`);

	if (contract.modifiers) {
		lines.push('\nModifiers:');
		for (const [, mod] of Object.entries(contract.modifiers)) {
			lines.push(`  ${mod.classPattern}  (${mod.dataAttribute}${mod.default ? `, default: ${mod.default}` : ''})`);
		}
	}

	if (contract.elements) {
		lines.push('\nElements:');
		for (const [name, el] of Object.entries(contract.elements)) {
			lines.push(`  ${el.selector}  <${el.tag}> — ${name}`);
		}
	}

	if (contract.contextModifiers) {
		lines.push('\nContext modifiers:');
		for (const [parent, ctx] of Object.entries(contract.contextModifiers)) {
			lines.push(`  ${ctx.selector}  (inside ${parent})`);
		}
	}

	if (contract.staticModifiers) {
		lines.push('\nStatic modifiers:');
		for (const mod of contract.staticModifiers) {
			lines.push(`  ${mod.selector}`);
		}
	}

	return lines.join('\n');
}
