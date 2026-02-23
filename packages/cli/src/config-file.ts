import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefraktConfig } from '@refrakt-md/types';

export interface PackageManager {
	name: 'npm' | 'pnpm' | 'yarn' | 'bun';
	installCmd: (source: string) => string;
}

const PM_LOCKFILES: Array<{ file: string; pm: PackageManager }> = [
	{
		file: 'bun.lock',
		pm: { name: 'bun', installCmd: (s) => `bun add ${s}` },
	},
	{
		file: 'bun.lockb',
		pm: { name: 'bun', installCmd: (s) => `bun add ${s}` },
	},
	{
		file: 'pnpm-lock.yaml',
		pm: { name: 'pnpm', installCmd: (s) => `pnpm add ${s}` },
	},
	{
		file: 'yarn.lock',
		pm: { name: 'yarn', installCmd: (s) => `yarn add ${s}` },
	},
];

const NPM_DEFAULT: PackageManager = {
	name: 'npm',
	installCmd: (s) => `npm install ${s}`,
};

/** Detect the project's package manager by checking for lockfiles */
export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
	for (const { file, pm } of PM_LOCKFILES) {
		if (existsSync(resolve(cwd, file))) return pm;
	}
	return NPM_DEFAULT;
}

/** Load refrakt.config.json from a directory */
export function loadRefraktConfigFile(cwd: string = process.cwd()): { path: string; config: RefraktConfig } {
	const configPath = resolve(cwd, 'refrakt.config.json');
	if (!existsSync(configPath)) {
		throw new Error(`No refrakt.config.json found in ${cwd}`);
	}
	const raw = readFileSync(configPath, 'utf-8');
	const config = JSON.parse(raw) as RefraktConfig;
	return { path: configPath, config };
}

/** Write refrakt.config.json, preserving formatting */
export function writeRefraktConfigFile(path: string, config: RefraktConfig): void {
	writeFileSync(path, JSON.stringify(config, null, '\t') + '\n');
}
