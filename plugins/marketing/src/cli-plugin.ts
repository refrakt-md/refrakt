import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import type { CliPlugin } from '@refrakt-md/types';
import { migrateTestimonialAttribution } from './migrate-testimonial.js';

/**
 * `refrakt marketing <command>` — the marketing plugin's CLI commands.
 */

const MARKDOWN = new Set(['.md', '.markdoc', '.mdoc']);

function markdownFiles(paths: string[]): string[] {
	const out = new Set<string>();
	const visit = (p: string) => {
		const abs = resolve(p);
		if (!existsSync(abs)) throw new Error(`path not found: ${p}`);
		if (statSync(abs).isDirectory()) {
			for (const entry of readdirSync(abs)) {
				if (entry.startsWith('.') || entry === 'node_modules') continue;
				visit(join(abs, entry));
			}
		} else if (MARKDOWN.has(extname(abs))) out.add(abs);
	};
	for (const p of paths) visit(p);
	return [...out].sort();
}

async function migrateTestimonial(args: string[]): Promise<void> {
	if (args.includes('--help') || args.includes('-h')) {
		console.log(`
Usage: refrakt marketing migrate-testimonial [paths…] [--apply]

Rewrites a testimonial's \`**Name** — Role\` paragraph into \`author\` and \`role\`
attributes, the form the composed testimonial takes (SPEC-161 D1). The paragraph
is read by the marketing plugin's own parser. Dry run by default.

  [paths…]   Files or directories to scan (default: current directory).
  --apply    Write the changes.
`);
		return;
	}
	const apply = args.includes('--apply');
	const unknown = args.find((a) => a.startsWith('-') && a !== '--apply');
	if (unknown) {
		console.error(`Error: Unknown option "${unknown}"`);
		process.exit(1);
	}
	const paths = args.filter((a) => !a.startsWith('-'));
	let files: string[];
	try {
		files = markdownFiles(paths.length > 0 ? paths : ['.']);
	} catch (e) {
		console.error(`Error: ${(e as Error).message}`);
		process.exit(1);
	}

	let total = 0;
	let changed = 0;
	for (const file of files) {
		const source = readFileSync(file, 'utf-8');
		if (!/\{%-?\s*(testimonial|review)\b/.test(source)) continue;
		const { output, count, skipped } = migrateTestimonialAttribution(source);
		const name = relative(process.cwd(), file);
		for (const s of skipped) console.log(`${name}:${s.line}: skipped — ${s.reason}`);
		if (count === 0) continue;
		total += count;
		changed++;
		if (apply) writeFileSync(file, output);
		console.log(`${apply ? 'Updated' : 'Would update'} ${name} (${count})`);
	}
	console.log(
		`\n${apply ? 'Migrated' : 'Would migrate'} ${total} testimonial${total === 1 ? '' : 's'} across ${changed} file${changed === 1 ? '' : 's'}.${apply ? '' : ' (Dry run — pass --apply to write.)'}`,
	);
}

const plugin: CliPlugin = {
	namespace: 'marketing',
	description: 'Marketing rune tools',
	commands: [
		{
			name: 'migrate-testimonial',
			description:
				'Rewrite `**Name** — Role` testimonial attributions into `author` and `role` attributes',
			handler: migrateTestimonial,
		},
	],
};

export default plugin;
