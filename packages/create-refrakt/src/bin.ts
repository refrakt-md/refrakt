#!/usr/bin/env node

import { scaffold, scaffoldTheme } from './scaffold.js';
import * as path from 'node:path';

const args = process.argv.slice(2);

let projectName: string | undefined;
let theme = '@refrakt-md/lumina';
let type: 'site' | 'theme' = 'site';
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

if (!projectName) {
	console.error('Error: Missing project name\n');
	printUsage();
	process.exit(1);
}

function printUsage(): void {
	console.log(`
Usage: create-refrakt <name> [options]

Options:
  --type <site|theme>    What to create (default: site)
  --theme, -t <package>  Theme package to use (sites only, default: @refrakt-md/lumina)
  --scope, -s <scope>    npm scope for the package (themes only, e.g., @my-org)
  --help, -h             Show this help message

Examples:
  npx create-refrakt my-site
  npx create-refrakt my-site --theme @refrakt-md/aurora
  npx create-refrakt my-theme --type theme
  npx create-refrakt my-theme --type theme --scope @my-org
`);
}

const targetDir = path.resolve(process.cwd(), projectName);

try {
	if (type === 'theme') {
		scaffoldTheme({ themeName: projectName, targetDir, scope });
	} else {
		scaffold({ projectName, targetDir, theme });
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
	console.log(`
Done! Your refrakt.md site is ready.

Next steps:

  cd ${projectName}
  npm install
  npm run dev
`);
}
