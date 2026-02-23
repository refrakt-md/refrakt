import JSZip from 'jszip';
import { compileTokens, compileDarkTokens } from './compiler.js';

/** Convert a display name to a valid npm package name */
function toPackageName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '') || 'my-theme';
}

export function generateBaseCss(lightTokens: Record<string, string>): string {
	return compileTokens(lightTokens);
}

export function generateDarkCss(darkTokens: Record<string, string>): string {
	return compileDarkTokens(darkTokens);
}

export function generateIndexCss(pkgName: string): string {
	return [
		`/* ${pkgName} — Theme for refrakt.md */`,
		`/* Import Lumina's complete rune CSS + default tokens */`,
		`@import '@refrakt-md/lumina/index.css';`,
		``,
		`/* Override with custom tokens */`,
		`@import './tokens/base.css';`,
		`@import './tokens/dark.css';`,
		``,
	].join('\n');
}

export function generateManifest(name: string, description: string): string {
	return JSON.stringify(
		{
			name,
			description,
			version: '1.0.0',
			author: '',
			prefix: 'rf',
			tokenPrefix: '--rf',
			darkMode: {
				attribute: 'data-theme',
				values: { dark: 'dark', light: 'light' },
				systemPreference: true,
			},
		},
		null,
		'\t',
	);
}

export function generatePackageJson(name: string, description: string): string {
	const pkgName = toPackageName(name);
	return JSON.stringify(
		{
			name: pkgName,
			description,
			version: '1.0.0',
			type: 'module',
			exports: {
				'.': './index.css',
				'./base.css': './base.css',
				'./manifest': './manifest.json',
				'./svelte/tokens.css': './svelte/tokens.css',
			},
			dependencies: {
				'@refrakt-md/lumina': '^0.5.0',
			},
			peerDependencies: {
				svelte: '^5.0.0',
			},
			peerDependenciesMeta: {
				svelte: { optional: true },
			},
		},
		null,
		'\t',
	);
}

function generateSvelteTokensCss(): string {
	return [
		`/* Token bridge — imports full theme CSS */`,
		`@import '../index.css';`,
		``,
	].join('\n');
}

interface ThemeExportData {
	name: string;
	description: string;
	lightTokens: Record<string, string>;
	darkTokens: Record<string, string>;
}

export async function buildThemeZip(data: ThemeExportData): Promise<Blob> {
	const zip = new JSZip();
	const pkgName = toPackageName(data.name);
	const root = zip.folder(pkgName)!;

	root.file('package.json', generatePackageJson(data.name, data.description));
	root.file('manifest.json', generateManifest(data.name, data.description));
	root.file('index.css', generateIndexCss(pkgName));
	root.file('base.css', generateIndexCss(pkgName)); // same as index.css for Tier 1

	const tokens = root.folder('tokens')!;
	tokens.file('base.css', generateBaseCss(data.lightTokens));
	tokens.file('dark.css', generateDarkCss(data.darkTokens));

	const svelte = root.folder('svelte')!;
	svelte.file('tokens.css', generateSvelteTokensCss());

	return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export { toPackageName };
