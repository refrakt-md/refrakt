import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { generateStructureContract, type RuneContract } from '@refrakt-md/transform';
import { baseConfig } from '@refrakt-md/theme-base';

export interface ScaffoldCssOptions {
	outputDir: string;
	force: boolean;
}

/** Merged view of all rune contracts that share the same block name */
interface MergedBlockContract {
	runeNames: string[];
	block: string;
	modifiers: NonNullable<RuneContract['modifiers']>;
	contextModifiers: NonNullable<RuneContract['contextModifiers']>;
	staticModifiers: NonNullable<RuneContract['staticModifiers']>;
	elements: NonNullable<RuneContract['elements']>;
}

export function scaffoldCssCommand(opts: ScaffoldCssOptions): void {
	const contract = generateStructureContract(baseConfig);
	const outputDir = resolve(opts.outputDir);

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	// Group runes by block name (e.g., Tier and FeaturedTier both use 'tier')
	const blockMap = new Map<string, MergedBlockContract>();

	for (const [runeName, runeContract] of Object.entries(contract.runes)) {
		const existing = blockMap.get(runeContract.block);
		if (existing) {
			existing.runeNames.push(runeName);
			Object.assign(existing.modifiers, runeContract.modifiers ?? {});
			Object.assign(existing.contextModifiers, runeContract.contextModifiers ?? {});
			existing.staticModifiers.push(...(runeContract.staticModifiers ?? []));
			Object.assign(existing.elements, runeContract.elements ?? {});
		} else {
			blockMap.set(runeContract.block, {
				runeNames: [runeName],
				block: runeContract.block,
				modifiers: { ...(runeContract.modifiers ?? {}) },
				contextModifiers: { ...(runeContract.contextModifiers ?? {}) },
				staticModifiers: [...(runeContract.staticModifiers ?? [])],
				elements: { ...(runeContract.elements ?? {}) },
			});
		}
	}

	let created = 0;
	let skipped = 0;

	for (const [blockName, merged] of blockMap) {
		const fileName = `${blockName}.css`;
		const filePath = join(outputDir, fileName);

		if (existsSync(filePath) && !opts.force) {
			skipped++;
			continue;
		}

		const css = generateBlockCss(merged, contract.prefix);
		writeFileSync(filePath, css);
		created++;
	}

	console.log(`Scaffold CSS: ${created} files created, ${skipped} skipped (already exist)`);

	if (skipped > 0 && !opts.force) {
		console.log('Use --force to overwrite existing files');
	}

	if (created > 0) {
		console.log(`Output directory: ${outputDir}`);
	}
}

function generateBlockCss(merged: MergedBlockContract, prefix: string): string {
	const block = `${prefix}-${merged.block}`;
	const label = merged.runeNames.join(', ');
	const lines: string[] = [];

	lines.push(`/* ${label} rune${merged.runeNames.length > 1 ? 's' : ''} */`);
	lines.push('');

	// Root block
	lines.push(`.${block} {`);
	lines.push('');
	lines.push('}');

	// Modifier selectors
	if (Object.keys(merged.modifiers).length > 0) {
		lines.push('');
		lines.push(`/* Modifiers */`);
		for (const [modName, mod] of Object.entries(merged.modifiers)) {
			if (mod.default) {
				lines.push(`.${block}--${mod.default} {`);
				lines.push('');
				lines.push('}');
			}
			lines.push(`/* ${modName}: ${mod.classPattern} [${mod.dataAttribute}] */`);
		}
	}

	// Context modifier selectors
	if (Object.keys(merged.contextModifiers).length > 0) {
		lines.push('');
		lines.push(`/* Context modifiers */`);
		for (const [parent, ctx] of Object.entries(merged.contextModifiers)) {
			lines.push(`/* When inside ${parent}: */`);
			lines.push(`${ctx.selector} {`);
			lines.push('');
			lines.push('}');
		}
	}

	// Static modifier selectors
	if (merged.staticModifiers.length > 0) {
		lines.push('');
		lines.push(`/* Static modifiers */`);
		for (const mod of merged.staticModifiers) {
			lines.push(`${mod.selector} {`);
			lines.push('');
			lines.push('}');
		}
	}

	// Element selectors
	if (Object.keys(merged.elements).length > 0) {
		lines.push('');
		lines.push(`/* Elements */`);
		for (const [elName, el] of Object.entries(merged.elements)) {
			const condNote = el.condition ? ` (conditional: ${el.condition})` : '';
			lines.push(`/* ${elName} — <${el.tag}> from ${el.source}${condNote} */`);
			lines.push(`${el.selector} {`);
			lines.push('');
			lines.push('}');
		}
	}

	lines.push('');

	return lines.join('\n');
}
