import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { generateStructureContract } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/theme-base';

export interface ContractsOptions {
	output?: string;
	check?: boolean;
}

export function contractsCommand(opts: ContractsOptions): void {
	const contract = generateStructureContract(baseConfig);
	const json = JSON.stringify(contract, null, '\t') + '\n';

	if (opts.check) {
		if (!opts.output) {
			console.error('Error: --check requires --output to specify the file to validate against');
			process.exit(1);
		}

		const target = resolve(opts.output);
		if (!existsSync(target)) {
			console.error(`FAIL: ${target} does not exist. Run without --check to generate it.`);
			process.exit(1);
		}

		const existing = readFileSync(target, 'utf-8');
		if (existing === json) {
			console.log(`OK: ${target} is up to date (${Object.keys(contract.runes).length} runes)`);
		} else {
			console.error(`FAIL: ${target} is out of date. Run \`refrakt contracts -o ${opts.output}\` to regenerate.`);
			process.exit(1);
		}
		return;
	}

	if (opts.output) {
		const target = resolve(opts.output);
		const dir = dirname(target);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		writeFileSync(target, json);
		console.log(`Written ${target} (${Object.keys(contract.runes).length} runes)`);
	} else {
		process.stdout.write(json);
	}
}
