#!/usr/bin/env node

import { scaffold } from './scaffold.js';
import * as path from 'node:path';

const args = process.argv.slice(2);

let projectName: string | undefined;
let theme = '@refract-md/theme-lumina';

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === '--theme' || arg === '-t') {
		theme = args[++i];
		if (!theme) {
			console.error('Error: --theme requires a value');
			process.exit(1);
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
Usage: create-refract <project-name> [options]

Options:
  --theme, -t <package>  Theme package to use (default: @refract-md/theme-lumina)
  --help, -h             Show this help message

Example:
  npx create-refract my-site
  npx create-refract my-site --theme @refract-md/theme-aurora
`);
}

const targetDir = path.resolve(process.cwd(), projectName);

try {
	scaffold({ projectName, targetDir, theme });
} catch (err) {
	console.error(`\nError: ${(err as Error).message}`);
	process.exit(1);
}

console.log(`
Done! Your refract.md site is ready.

Next steps:

  cd ${projectName}
  npm install
  npm run dev
`);
