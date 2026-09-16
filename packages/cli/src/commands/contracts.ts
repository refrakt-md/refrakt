import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { generateStructureContract } from '@refrakt-md/transform';
import type { ThemeConfig } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/runes';
import type { Rune } from '@refrakt-md/runes';
import { collectSchemaRows } from '@refrakt-md/runes';

export interface ContractsOptions {
	output?: string;
	check?: boolean;
	config?: ThemeConfig;
	/**
	 * The resolved rune catalog, for the schema.org section (WORK-566).
	 *
	 * `generateStructureContract` takes only a `ThemeConfig`, and the schema
	 * tables are declared on the runes — `@refrakt-md/transform` cannot reach
	 * them without inverting the dependency. So the section is assembled here,
	 * where both are in hand.
	 */
	runes?: Record<string, Rune>;
}

export function contractsCommand(opts: ContractsOptions): void {
	// WORK-566 — close the gap between what `contracts` claims to cover and what
	// it does. It documents "the complete HTML structure the identity transform
	// produces", derived purely from config — and a rune's structured data is
	// declared in its tag module, so the contract has never described it.
	//
	// The rows go *into* `generateStructureContract` rather than being merged in
	// afterwards, so the committed artifact and its drift test are produced by one
	// call with one input. Enriching afterwards made the CLI's output diverge from
	// what the test regenerates, which is a second implementation by another name.
	const contract = generateStructureContract(opts.config ?? baseConfig, {
		schemaRows: opts.runes ? collectSchemaRows(opts.runes) : undefined,
	});

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
			console.error(
				`FAIL: ${target} is out of date. Run \`refrakt contracts -o ${opts.output}\` to regenerate.`,
			);
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
