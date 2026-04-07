#!/usr/bin/env node

import { scaffold, scaffoldTheme } from './scaffold.js';
import type { ScaffoldTarget } from './scaffold.js';
import * as path from 'node:path';

const args = process.argv.slice(2);

const VALID_TARGETS: ScaffoldTarget[] = ['sveltekit', 'html', 'astro', 'nuxt', 'next', 'eleventy'];

const TARGET_LABELS: Record<ScaffoldTarget, string> = {
	sveltekit: 'SvelteKit',
	astro: 'Astro',
	nuxt: 'Nuxt',
	next: 'Next.js',
	eleventy: 'Eleventy',
	html: 'Static HTML',
};

let projectName: string | undefined;
let theme = '@refrakt-md/lumina';
let type: 'site' | 'theme' = 'site';
let target: ScaffoldTarget | undefined;
let targetExplicit = false;
let scope: string | undefined;

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === '--theme' || arg === '-t') {
		theme = args[++i];
		if (!theme) {
			console.error('Error: --theme requires a value');
			process.exit(1);
		}
	} else if (arg === '--type') {
		const val = args[++i];
		if (val !== 'site' && val !== 'theme') {
			console.error('Error: --type must be "site" or "theme"');
			process.exit(1);
		}
		type = val;
	} else if (arg === '--target') {
		const val = args[++i] as ScaffoldTarget;
		if (!VALID_TARGETS.includes(val)) {
			console.error(`Error: --target must be one of: ${VALID_TARGETS.join(', ')}`);
			process.exit(1);
		}
		target = val;
		targetExplicit = true;
	} else if (arg === '--scope' || arg === '-s') {
		scope = args[++i];
		if (!scope) {
			console.error('Error: --scope requires a value');
			process.exit(1);
		}
		if (!scope.startsWith('@')) {
			scope = `@${scope}`;
		}
	} else if (arg === '--help' || arg === '-h') {
		printUsage();
		process.exit(0);
	} else if (arg.startsWith('-')) {
		console.error(`Error: Unknown flag "${arg}"\n`);
		printUsage();
		process.exit(1);
	} else if (!projectName) {
		projectName = arg;
	} else {
		console.error(`Error: Unexpected argument "${arg}"\n`);
		printUsage();
		process.exit(1);
	}
}

function printUsage(): void {
	console.log(`
Usage: create-refrakt [name] [options]

Options:
  --type <site|theme>          What to create (default: site)
  --target <target>            Adapter target (sites only, default: sveltekit)
                               Targets: ${VALID_TARGETS.join(', ')}
  --theme, -t <package>        Theme package to use (sites only, default: @refrakt-md/lumina)
  --scope, -s <scope>          npm scope for the package (themes only, e.g., @my-org)
  --help, -h                   Show this help message

Examples:
  npx create-refrakt my-site
  npx create-refrakt my-site --target astro
  npx create-refrakt my-site --target next
  npx create-refrakt my-site --target nuxt
  npx create-refrakt my-site --target eleventy
  npx create-refrakt my-site --target html
  npx create-refrakt my-site --theme @refrakt-md/aurora
  npx create-refrakt my-theme --type theme
  npx create-refrakt my-theme --type theme --scope @my-org
`);
}

async function run(): Promise<void> {
	const needsPrompt = !projectName || (type === 'site' && !targetExplicit);

	if (needsPrompt && process.stdout.isTTY) {
		const { intro, text, select, isCancel, cancel, outro } = await import('@clack/prompts');

		intro('create-refrakt');

		if (!projectName) {
			const name = await text({
				message: 'Project name',
				placeholder: 'my-site',
				validate(value) {
					if (!value || !value.trim()) return 'Project name is required';
					if (/[^a-zA-Z0-9._-]/.test(value)) return 'Project name contains invalid characters';
				},
			});

			if (isCancel(name)) {
				cancel('Cancelled.');
				process.exit(0);
			}

			projectName = name;
		}

		if (type === 'site' && !targetExplicit) {
			const selected = await select({
				message: 'Which framework?',
				options: VALID_TARGETS.map((t) => ({
					value: t,
					label: TARGET_LABELS[t],
				})),
			});

			if (isCancel(selected)) {
				cancel('Cancelled.');
				process.exit(0);
			}

			target = selected as ScaffoldTarget;
		}

		outro(`Creating ${type === 'theme' ? 'theme' : `${TARGET_LABELS[target!]} site`}: ${projectName}`);
	} else if (!projectName) {
		console.error('Error: Missing project name\n');
		printUsage();
		process.exit(1);
	}

	// Default target if still unset (non-interactive or theme)
	if (!target) {
		target = 'sveltekit';
	}

	const targetDir = path.resolve(process.cwd(), projectName!);

	try {
		if (type === 'theme') {
			scaffoldTheme({ themeName: projectName!, targetDir, scope });
		} else {
			scaffold({ projectName: projectName!, targetDir, theme, target });
		}
	} catch (err) {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	}

	if (type === 'theme') {
		console.log(`
Done! Your refrakt.md theme package is ready.

Next steps:

  cd ${projectName}
  npm install
  npm run build

Then use it in a site:

  {
    "theme": "${scope ? `${scope}/${projectName}` : projectName}",
    "target": "svelte"
  }

Run \`refrakt scaffold-css\` to generate CSS stubs for all runes.
`);
	} else {
		const devCommands: Record<ScaffoldTarget, string> = {
			sveltekit: `  cd ${projectName}\n  npm install\n  npm run dev`,
			astro: `  cd ${projectName}\n  npm install\n  npm run dev`,
			nuxt: `  cd ${projectName}\n  npm install\n  npm run dev`,
			next: `  cd ${projectName}\n  npm install\n  npm run dev`,
			eleventy: `  cd ${projectName}\n  npm install\n  npm run dev`,
			html: `  cd ${projectName}\n  npm install\n  npm run build\n  npm run serve`,
		};

		console.log(`
Done! Your refrakt.md site is ready (target: ${target}).

Next steps:

${devCommands[target]}
`);
	}
}

run();
