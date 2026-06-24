import { mkdirSync, cpSync, writeFileSync, existsSync, renameSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInit } from '@refrakt-md/plan/init';
import { renderScaffoldAgentsMd } from './agents-md.js';

function getRefraktVersion(): string {
	const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
	return pkg.version;
}

/** Major.minor of the refrakt package, used to pin scaffolded `$schema` URLs.
 *  New projects reference the versioned schema (`https://refrakt.md/schemas/vX.Y/...`)
 *  so they don't get false validation errors when later refrakt versions add
 *  fields. The unversioned URL stays valid as a "latest" alias for users who
 *  want to track current main. */
function getRefraktSchemaVersion(): string {
	const version = getRefraktVersion();
	const [major, minor] = version.split('.');
	return `v${major}.${minor}`;
}

export type ScaffoldTarget = 'sveltekit' | 'html' | 'astro' | 'nuxt' | 'next' | 'eleventy';

/** Minor-pinned peer range for `@refrakt-md/*` in scaffolded extensions
 *  (ADR-023): `>=MAJOR.MINOR <MAJOR.(MINOR+1)`. */
function refraktPeerRange(): string {
	const [major, minor] = getRefraktVersion().split('.').map(Number);
	return `>=${major}.${minor} <${major}.${(minor ?? 0) + 1}`;
}

/** URL of the published token-contract JSON Schema for the current minor
 *  (WORK-458), referenced by scaffolded JSON presets via `$schema`. */
function tokenSchemaUrl(): string {
	return `https://refrakt.md/schemas/${getRefraktSchemaVersion()}/theme-tokens.json`;
}

export interface ScaffoldOptions {
	projectName: string;
	targetDir: string;
	theme: string;
	target?: ScaffoldTarget;
}

export async function scaffold(options: ScaffoldOptions): Promise<void> {
	const { targetDir, target = 'sveltekit' } = options;

	if (existsSync(targetDir)) {
		throw new Error(`Directory "${targetDir}" already exists`);
	}

	mkdirSync(targetDir, { recursive: true });

	const scaffolders: Record<ScaffoldTarget, (opts: ScaffoldOptions) => Promise<void>> = {
		sveltekit: scaffoldSvelteKitSite,
		html: scaffoldHtmlSite,
		astro: scaffoldAstroSite,
		nuxt: scaffoldNuxtSite,
		next: scaffoldNextSite,
		eleventy: scaffoldEleventySite,
	};

	await scaffolders[target](options);
}

/** Default set of plugins scaffolded projects ship with. Kept in sync
 *  with `generateRefraktConfig`. */
const DEFAULT_SCAFFOLDED_PLUGINS = ['@refrakt-md/marketing'];

/** Generate and write AGENTS.md to the scaffolded project's root. Runs after the
 *  config file has been written so the reference reflects the chosen plugin set. */
async function writeAgentsMd(targetDir: string, plugins: string[]): Promise<void> {
	const content = await renderScaffoldAgentsMd(plugins);
	writeFileSync(path.join(targetDir, 'AGENTS.md'), content);
}

async function scaffoldSvelteKitSite(options: ScaffoldOptions): Promise<void> {
	const { projectName, targetDir, theme } = options;

	// Copy template directory recursively
	const templateDir = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		'..',
		'template'
	);

	if (!existsSync(templateDir)) {
		throw new Error(
			`Template directory not found at ${templateDir}. ` +
			`This is a bug in create-refrakt — please report it.`
		);
	}

	cpSync(templateDir, targetDir, { recursive: true });
	renameDotfiles(targetDir);

	writeFileSync(path.join(targetDir, 'package.json'), generatePackageJson(projectName, theme));
	writeFileSync(path.join(targetDir, 'refrakt.config.json'), generateRefraktConfig(theme));
	writeFileSync(path.join(targetDir, '.mcp.json'), generateMcpConfig());
	writeFileSync(path.join(targetDir, 'README.md'), generateReadme(projectName));
	await writeAgentsMd(targetDir, DEFAULT_SCAFFOLDED_PLUGINS);
}

async function scaffoldHtmlSite(options: ScaffoldOptions): Promise<void> {
	const { projectName, targetDir, theme } = options;

	const templateDir = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		'..',
		'template-html'
	);

	if (!existsSync(templateDir)) {
		throw new Error(
			`Template directory not found at ${templateDir}. ` +
			`This is a bug in create-refrakt — please report it.`
		);
	}

	cpSync(templateDir, targetDir, { recursive: true });
	renameDotfiles(targetDir);

	writeFileSync(path.join(targetDir, 'package.json'), generateHtmlPackageJson(projectName, theme));
	writeFileSync(path.join(targetDir, 'refrakt.config.json'), generateRefraktConfig(theme, 'html'));
	writeFileSync(path.join(targetDir, '.mcp.json'), generateMcpConfig());
	writeFileSync(path.join(targetDir, 'README.md'), generateReadme(projectName));
	await writeAgentsMd(targetDir, DEFAULT_SCAFFOLDED_PLUGINS);
}

function generatePackageJson(projectName: string, theme: string): string {
	const v = `~${getRefraktVersion()}`;
	const pkg = {
		name: projectName,
		private: true,
		version: '0.0.1',
		type: 'module',
		scripts: {
			dev: 'vite dev',
			// Pagefind indexes the built HTML and writes build/pagefind/, served at
			// /pagefind/ where the search behavior loads it. Search results are only
			// available in a production build — the dev server has no index.
			build: 'vite build && pagefind --site build',
			preview: 'vite preview',
			prepare: "svelte-kit sync || echo ''",
			check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
		},
		dependencies: {
			'@refrakt-md/content': v,
			'@refrakt-md/highlight': v,
			'@refrakt-md/marketing': v,
			'@refrakt-md/runes': v,
			'@refrakt-md/svelte': v,
			'@refrakt-md/sveltekit': v,
			'@refrakt-md/transform': v,
			'@refrakt-md/types': v,
			[theme]: v,
			'@markdoc/markdoc': '^0.4.0',
		},
		devDependencies: {
			'@sveltejs/adapter-static': '^3.0.0',
			'@sveltejs/kit': '^2.50.0',
			'@sveltejs/vite-plugin-svelte': '^6.0.0',
			'@tailwindcss/vite': '^4.0.0',
			'pagefind': '^1.3.0',
			'svelte': '^5.0.0',
			'svelte-check': '^4.0.0',
			'tailwindcss': '^4.0.0',
			'typescript': '^5.4.0',
			'vite': '^7.0.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

/** Project-scoped MCP server registration. Read by Claude Code, Cursor, and
 *  other MCP-aware clients via `.mcp.json` at the project root. */
function generateMcpConfig(): string {
	return JSON.stringify(
		{
			mcpServers: {
				refrakt: {
					command: 'npx',
					args: ['@refrakt-md/mcp'],
				},
			},
		},
		null,
		'\t',
	) + '\n';
}

function generateRefraktConfig(theme: string, target: string = 'svelte'): string {
	const config = {
		$schema: `https://refrakt.md/schemas/${getRefraktSchemaVersion()}/refrakt.config.schema.json`,
		sites: {
			main: {
				contentDir: './content',
				theme,
				target,
				plugins: ['@refrakt-md/marketing'],
				routeRules: [
					{ pattern: '**', layout: 'default' },
				],
			},
		},
	};
	return JSON.stringify(config, null, '\t') + '\n';
}

function generateHtmlPackageJson(projectName: string, theme: string): string {
	const v = `~${getRefraktVersion()}`;
	const pkg = {
		name: projectName,
		private: true,
		version: '0.0.1',
		type: 'module',
		scripts: {
			build: 'tsx build.ts',
			serve: 'npx serve build',
		},
		dependencies: {
			'@refrakt-md/behaviors': v,
			'@refrakt-md/content': v,
			'@refrakt-md/highlight': v,
			'@refrakt-md/html': v,
			'@refrakt-md/marketing': v,
			'@refrakt-md/runes': v,
			'@refrakt-md/transform': v,
			'@refrakt-md/types': v,
			[theme]: v,
			'@markdoc/markdoc': '^0.4.0',
		},
		devDependencies: {
			'esbuild': '^0.25.0',
			'tsx': '^4.0.0',
			'typescript': '^5.4.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

async function scaffoldAstroSite(options: ScaffoldOptions): Promise<void> {
	const { projectName, targetDir, theme } = options;

	const templateDir = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		'..',
		'template-astro'
	);

	if (!existsSync(templateDir)) {
		throw new Error(
			`Template directory not found at ${templateDir}. ` +
			`This is a bug in create-refrakt — please report it.`
		);
	}

	cpSync(templateDir, targetDir, { recursive: true });
	renameDotfiles(targetDir);

	writeFileSync(path.join(targetDir, 'package.json'), generateAstroPackageJson(projectName, theme));
	writeFileSync(path.join(targetDir, 'refrakt.config.json'), generateRefraktConfig(theme, 'astro'));
	writeFileSync(path.join(targetDir, '.mcp.json'), generateMcpConfig());
	writeFileSync(path.join(targetDir, 'README.md'), generateReadme(projectName));
	await writeAgentsMd(targetDir, DEFAULT_SCAFFOLDED_PLUGINS);
}

async function scaffoldNuxtSite(options: ScaffoldOptions): Promise<void> {
	const { projectName, targetDir, theme } = options;

	const templateDir = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		'..',
		'template-nuxt'
	);

	if (!existsSync(templateDir)) {
		throw new Error(
			`Template directory not found at ${templateDir}. ` +
			`This is a bug in create-refrakt — please report it.`
		);
	}

	cpSync(templateDir, targetDir, { recursive: true });
	renameDotfiles(targetDir);

	writeFileSync(path.join(targetDir, 'package.json'), generateNuxtPackageJson(projectName, theme));
	writeFileSync(path.join(targetDir, 'refrakt.config.json'), generateRefraktConfig(theme, 'nuxt'));
	writeFileSync(path.join(targetDir, '.mcp.json'), generateMcpConfig());
	writeFileSync(path.join(targetDir, 'README.md'), generateReadme(projectName));
	await writeAgentsMd(targetDir, DEFAULT_SCAFFOLDED_PLUGINS);
}

async function scaffoldNextSite(options: ScaffoldOptions): Promise<void> {
	const { projectName, targetDir, theme } = options;

	const templateDir = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		'..',
		'template-next'
	);

	if (!existsSync(templateDir)) {
		throw new Error(
			`Template directory not found at ${templateDir}. ` +
			`This is a bug in create-refrakt — please report it.`
		);
	}

	cpSync(templateDir, targetDir, { recursive: true });
	renameDotfiles(targetDir);

	writeFileSync(path.join(targetDir, 'package.json'), generateNextPackageJson(projectName, theme));
	writeFileSync(path.join(targetDir, 'refrakt.config.json'), generateRefraktConfig(theme, 'next'));
	writeFileSync(path.join(targetDir, '.mcp.json'), generateMcpConfig());
	writeFileSync(path.join(targetDir, 'README.md'), generateReadme(projectName));
	await writeAgentsMd(targetDir, DEFAULT_SCAFFOLDED_PLUGINS);
}

async function scaffoldEleventySite(options: ScaffoldOptions): Promise<void> {
	const { projectName, targetDir, theme } = options;

	const templateDir = path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		'..',
		'template-eleventy'
	);

	if (!existsSync(templateDir)) {
		throw new Error(
			`Template directory not found at ${templateDir}. ` +
			`This is a bug in create-refrakt — please report it.`
		);
	}

	cpSync(templateDir, targetDir, { recursive: true });
	renameDotfiles(targetDir);

	writeFileSync(path.join(targetDir, 'package.json'), generateEleventyPackageJson(projectName, theme));
	writeFileSync(path.join(targetDir, 'refrakt.config.json'), generateRefraktConfig(theme, 'eleventy'));
	writeFileSync(path.join(targetDir, '.mcp.json'), generateMcpConfig());
	writeFileSync(path.join(targetDir, 'README.md'), generateReadme(projectName));
	await writeAgentsMd(targetDir, DEFAULT_SCAFFOLDED_PLUGINS);
}

function renameDotfiles(targetDir: string): void {
	const dotfileRenames: Record<string, string> = {
		'_gitignore': '.gitignore',
		'_npmrc': '.npmrc',
	};
	for (const [from, to] of Object.entries(dotfileRenames)) {
		const srcPath = path.join(targetDir, from);
		if (existsSync(srcPath)) {
			renameSync(srcPath, path.join(targetDir, to));
		}
	}
}

function generateAstroPackageJson(projectName: string, theme: string): string {
	const v = `~${getRefraktVersion()}`;
	const pkg = {
		name: projectName,
		private: true,
		version: '0.0.1',
		type: 'module',
		scripts: {
			dev: 'astro dev',
			build: 'astro build',
			preview: 'astro preview',
		},
		dependencies: {
			'@refrakt-md/astro': v,
			'@refrakt-md/behaviors': v,
			'@refrakt-md/content': v,
			'@refrakt-md/marketing': v,
			'@refrakt-md/runes': v,
			'@refrakt-md/transform': v,
			'@refrakt-md/types': v,
			[theme]: v,
			'astro': '^5.0.0',
			'@markdoc/markdoc': '^0.4.0',
		},
		devDependencies: {
			'typescript': '^5.4.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

function generateNuxtPackageJson(projectName: string, theme: string): string {
	const v = `~${getRefraktVersion()}`;
	const pkg = {
		name: projectName,
		private: true,
		version: '0.0.1',
		type: 'module',
		scripts: {
			dev: 'nuxt dev',
			build: 'nuxt generate',
			preview: 'nuxt preview',
		},
		dependencies: {
			'@refrakt-md/content': v,
			'@refrakt-md/marketing': v,
			'@refrakt-md/nuxt': v,
			'@refrakt-md/runes': v,
			'@refrakt-md/transform': v,
			'@refrakt-md/types': v,
			[theme]: v,
			'@markdoc/markdoc': '^0.4.0',
		},
		devDependencies: {
			'nuxt': '^3.0.0',
			'typescript': '^5.4.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

function generateNextPackageJson(projectName: string, theme: string): string {
	const v = `~${getRefraktVersion()}`;
	const pkg = {
		name: projectName,
		private: true,
		version: '0.0.1',
		type: 'module',
		scripts: {
			dev: 'next dev',
			build: 'next build',
			start: 'npx serve out',
		},
		dependencies: {
			'@refrakt-md/behaviors': v,
			'@refrakt-md/content': v,
			'@refrakt-md/marketing': v,
			'@refrakt-md/next': v,
			'@refrakt-md/runes': v,
			'@refrakt-md/transform': v,
			'@refrakt-md/types': v,
			[theme]: v,
			'next': '^15.0.0',
			'react': '^19.0.0',
			'react-dom': '^19.0.0',
			'@markdoc/markdoc': '^0.4.0',
		},
		devDependencies: {
			'@types/react': '^19.0.0',
			'typescript': '^5.4.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

function generateEleventyPackageJson(projectName: string, theme: string): string {
	const v = `~${getRefraktVersion()}`;
	const pkg = {
		name: projectName,
		private: true,
		version: '0.0.1',
		type: 'module',
		scripts: {
			dev: 'eleventy --serve',
			build: 'eleventy',
		},
		dependencies: {
			'@refrakt-md/content': v,
			'@refrakt-md/eleventy': v,
			'@refrakt-md/marketing': v,
			'@refrakt-md/runes': v,
			'@refrakt-md/transform': v,
			'@refrakt-md/types': v,
			[theme]: v,
			'@markdoc/markdoc': '^0.4.0',
		},
		devDependencies: {
			'@11ty/eleventy': '^3.0.0',
			'typescript': '^5.4.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

function generateReadme(projectName: string): string {
	return `# ${projectName}

A [refrakt.md](https://github.com/bjornandersson/refrakt.md) site.

## Development

\`\`\`sh
npm install
npm run dev
\`\`\`

## Building

\`\`\`sh
npm run build
npm run preview
\`\`\`

## Authoring content

Content lives in \`./content\` as \`.md\` files. Runes — the Markdoc tags like \`{% hint %}\` and \`{% hero %}\` that give this site its rich structure — are documented in [\`AGENTS.md\`](./AGENTS.md). That file is the canonical rune reference for both human contributors and coding agents (Claude Code, Cursor, Aider, GitHub Copilot).

## Configuration

Site settings live under \`sites.main\` in \`refrakt.config.json\`. To add a second site (e.g., a blog or docs subsite) declare another entry under \`sites\`, then pass \`site: '<name>'\` to the SvelteKit plugin in the corresponding \`vite.config.ts\`.

When you add or remove plugins in \`sites.main.plugins\`, regenerate \`AGENTS.md\`:

\`\`\`sh
npx refrakt reference dump
\`\`\`

Consider adding \`npx refrakt reference dump --check\` to CI so stale rune references fail the build.
`;
}

// ─── Theme scaffolding ───────────────────────────────────────────────

export interface ThemeScaffoldOptions {
	themeName: string;
	targetDir: string;
	scope?: string;
	/** Opt into a framework-specific component layer (ADR-024). Only `'svelte'`
	 *  is supported today. Omitted → a framework-agnostic theme (the default). */
	target?: 'svelte';
}

export function scaffoldTheme(options: ThemeScaffoldOptions): void {
	const { themeName, targetDir, scope, target } = options;
	const svelte = target === 'svelte';

	if (existsSync(targetDir)) {
		throw new Error(`Directory "${targetDir}" already exists`);
	}

	const pluginName = scope ? `${scope}/${themeName}` : themeName;

	// Framework-agnostic core (ADR-024): tokens + transform config + layout
	// configs + manifest + per-rune CSS + css-coverage test. Renders under any
	// adapter. The Svelte component layer is opt-in (`--target svelte`).
	mkdirSync(path.join(targetDir, 'src'), { recursive: true });
	mkdirSync(path.join(targetDir, 'tokens'), { recursive: true });
	mkdirSync(path.join(targetDir, 'styles', 'runes'), { recursive: true });
	mkdirSync(path.join(targetDir, 'test'), { recursive: true });
	mkdirSync(path.join(targetDir, 'preview'), { recursive: true });

	writeFileSync(path.join(targetDir, 'package.json'), generateThemePackageJson(pluginName, svelte));
	writeFileSync(path.join(targetDir, 'src', 'config.ts'), generateThemeConfig());
	writeFileSync(path.join(targetDir, 'src', 'layouts.ts'), generateThemeLayouts());
	writeFileSync(path.join(targetDir, 'manifest.json'), generateThemeManifest(pluginName));
	writeFileSync(path.join(targetDir, 'index.css'), generateThemeIndexCss());
	writeFileSync(path.join(targetDir, 'tokens', 'base.css'), generateThemeBaseTokens());
	writeFileSync(path.join(targetDir, 'tokens', 'dark.css'), generateThemeDarkTokens());
	writeFileSync(path.join(targetDir, 'styles', 'global.css'), generateThemeGlobalCss());
	writeFileSync(path.join(targetDir, 'tsconfig.json'), generateThemeTsconfig());
	writeFileSync(path.join(targetDir, 'test', 'css-coverage.test.ts'), generateThemeCssCoverageTest());
	writeFileSync(path.join(targetDir, 'preview', 'kitchen-sink.md'), generateThemeKitchenSink());
	writeFileSync(path.join(targetDir, 'base.css'), generateThemeBaseCss());

	// Optional Svelte component layer (ADR-024) — additive override on top of the
	// agnostic core, consumed only by the Svelte/SvelteKit adapter.
	if (svelte) {
		mkdirSync(path.join(targetDir, 'svelte', 'layouts'), { recursive: true });
		writeFileSync(path.join(targetDir, 'svelte', 'index.ts'), generateThemeSvelteIndex());
		writeFileSync(path.join(targetDir, 'svelte', 'layouts', 'DefaultLayout.svelte'), generateThemeDefaultLayout());
		writeFileSync(path.join(targetDir, 'svelte', 'tokens.css'), generateThemeTokensBridge());
	}
}

function generateThemePackageJson(pluginName: string, svelte: boolean): string {
	const peer = refraktPeerRange();
	const exports: Record<string, unknown> = {
		'.': './index.css',
		'./base.css': './base.css',
		'./transform': { types: './dist/config.d.ts', default: './dist/config.js' },
		'./layouts': { types: './dist/layouts.d.ts', default: './dist/layouts.js' },
		'./manifest': './manifest.json',
		'./styles/runes/*.css': './styles/runes/*.css',
	};
	const files = ['dist', 'base.css', 'index.css', 'tokens', 'styles', 'manifest.json'];
	// ADR-023: @refrakt-md/* as peerDependencies (minor range), mirrored into
	// devDependencies so the package builds in isolation.
	const peers: Record<string, string> = {
		'@refrakt-md/runes': peer,
		'@refrakt-md/transform': peer,
		'@refrakt-md/types': peer,
	};
	if (svelte) {
		exports['./svelte'] = { svelte: './svelte/index.ts', default: './svelte/index.ts' };
		exports['./svelte/tokens.css'] = './svelte/tokens.css';
		files.push('svelte');
		peers['@refrakt-md/svelte'] = peer;
	}
	const pkg = {
		name: pluginName,
		version: '0.1.0',
		type: 'module',
		main: 'dist/config.js',
		types: 'dist/config.d.ts',
		exports,
		files,
		scripts: {
			build: 'tsc',
			test: 'vitest run',
		},
		peerDependencies: peers,
		devDependencies: {
			...peers,
			vitest: '^3.0.0',
			postcss: '^8.4.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

/** Framework-agnostic layout map (ADR-024) — re-exports the built-in layout
 *  configs so the theme renders under any adapter. Mirrors the reference theme. */
function generateThemeLayouts(): string {
	return `import { defaultLayout, docsLayout, blogArticleLayout } from '@refrakt-md/transform';

/** Layout name → LayoutConfig. Framework-agnostic: consumed by every adapter.
 *  Add or override layouts here; a framework-specific component layer (if any)
 *  lives under svelte/ and is opt-in. */
export const layouts = {
\tdefault: defaultLayout,
\tdocs: docsLayout,
\t'blog-article': blogArticleLayout,
};
`;
}

function generateThemeConfig(): string {
	return `import { baseConfig } from '@refrakt-md/runes';
import { mergeThemeConfig } from '@refrakt-md/transform';

export const themeConfig = mergeThemeConfig(baseConfig, {
\t// Provide icon SVGs for runes that display them (e.g., Hint)
\ticons: {
\t\t// hint: {
\t\t//   note: '<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>',
\t\t//   warning: '<svg ...>...</svg>',
\t\t//   caution: '<svg ...>...</svg>',
\t\t//   check: '<svg ...>...</svg>',
\t\t// },
\t},

\t// Override specific rune configs (optional)
\trunes: {},
});
`;
}

function generateThemeSvelteIndex(): string {
	return `import type { SvelteTheme } from '@refrakt-md/svelte';
import manifest from '../manifest.json';
import { registry } from '@refrakt-md/svelte';
import { elements } from '@refrakt-md/svelte';
import DefaultLayout from './layouts/DefaultLayout.svelte';

export { default as manifest } from '../manifest.json';

export const theme: SvelteTheme = {
\tmanifest: manifest as any,
\tlayouts: { default: DefaultLayout },
\tcomponents: registry,
\telements,
};

export { registry };
export { behaviors } from '@refrakt-md/svelte';
export { default as DefaultLayout } from './layouts/DefaultLayout.svelte';
`;
}

function generateThemeManifest(pluginName: string): string {
	// Framework-agnostic manifest (ADR-024): no `target`; layouts declare only
	// their regions (the LayoutConfig lives in src/layouts.ts, consumed by every
	// adapter). `refrakt` is the ADR-023 compatibility range.
	const manifest = {
		name: pluginName,
		version: '0.1.0',
		refrakt: refraktPeerRange(),
		designTokens: './tokens/base.css',
		layouts: {
			default: { regions: ['header', 'footer'] },
			docs: { regions: ['header', 'nav', 'sidebar', 'footer'] },
			'blog-article': { regions: ['header', 'sidebar', 'footer'] },
		},
		components: {},
		unsupportedRuneBehavior: 'passthrough',
	};
	return JSON.stringify(manifest, null, '\t') + '\n';
}

function generateThemeIndexCss(): string {
	return `/* Design tokens */
@import './tokens/base.css';
@import './tokens/dark.css';

/* Global styles */
@import './styles/global.css';

/* Rune styles — add imports as you create CSS for each rune */
/* @import './styles/runes/hint.css'; */
/* @import './styles/runes/grid.css'; */
`;
}

function generateThemeBaseTokens(): string {
	return `:root {
\t/* Typography */
\t--rf-font-sans: system-ui, -apple-system, sans-serif;
\t--rf-font-mono: ui-monospace, 'SFMono-Regular', monospace;

\t/* Core palette */
\t--rf-color-text: #1a1a2e;
\t--rf-color-muted: #64748b;
\t--rf-color-border: #e2e8f0;
\t--rf-color-bg: #ffffff;
\t--rf-color-primary: #3b82f6;
\t--rf-color-primary-hover: #2563eb;
\t/* primary-bg (subtle wash, derived) + on-primary (text on a primary fill) */
\t--rf-color-primary-bg: color-mix(in oklch, var(--rf-color-primary) 10%, transparent);
\t--rf-color-on-primary: #ffffff;

\t/* Surfaces */
\t--rf-color-surface: #f8fafc;
\t--rf-color-surface-hover: #f1f5f9;
\t--rf-color-surface-active: #e2e8f0;
\t--rf-color-surface-raised: #ffffff;

\t/* Semantic */
\t--rf-color-info: #3b82f6;
\t--rf-color-info-bg: #eff6ff;
\t--rf-color-info-border: #bfdbfe;
\t--rf-color-warning: #f59e0b;
\t--rf-color-warning-bg: #fffbeb;
\t--rf-color-warning-border: #fde68a;
\t--rf-color-danger: #ef4444;
\t--rf-color-danger-bg: #fef2f2;
\t--rf-color-danger-border: #fecaca;
\t--rf-color-success: #10b981;
\t--rf-color-success-bg: #ecfdf5;
\t--rf-color-success-border: #a7f3d0;

\t/* Radii */
\t--rf-radius-sm: 6px;
\t--rf-radius-md: 10px;
\t--rf-radius-lg: 16px;
\t--rf-radius-full: 9999px;

\t/* Shadows */
\t--rf-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
\t--rf-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.07);
\t--rf-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
}
`;
}

function generateThemeDarkTokens(): string {
	return `[data-theme="dark"] {
\t--rf-color-text: #e2e8f0;
\t--rf-color-muted: #94a3b8;
\t--rf-color-border: #334155;
\t--rf-color-bg: #0f172a;
\t--rf-color-surface: #1e293b;
\t--rf-color-surface-hover: #334155;
\t--rf-color-surface-active: #475569;
\t--rf-color-surface-raised: #1e293b;
\t--rf-color-info-bg: #1e3a5f;
\t--rf-color-info-border: #1e40af;
\t--rf-color-warning-bg: #451a03;
\t--rf-color-warning-border: #92400e;
\t--rf-color-danger-bg: #450a0a;
\t--rf-color-danger-border: #991b1b;
\t--rf-color-success-bg: #052e16;
\t--rf-color-success-border: #166534;
}

@media (prefers-color-scheme: dark) {
\t:root:not([data-theme="light"]) {
\t\t--rf-color-text: #e2e8f0;
\t\t--rf-color-muted: #94a3b8;
\t\t--rf-color-border: #334155;
\t\t--rf-color-bg: #0f172a;
\t\t--rf-color-surface: #1e293b;
\t\t--rf-color-surface-hover: #334155;
\t\t--rf-color-surface-active: #475569;
\t\t--rf-color-surface-raised: #1e293b;
\t\t--rf-color-info-bg: #1e3a5f;
\t\t--rf-color-info-border: #1e40af;
\t\t--rf-color-warning-bg: #451a03;
\t\t--rf-color-warning-border: #92400e;
\t\t--rf-color-danger-bg: #450a0a;
\t\t--rf-color-danger-border: #991b1b;
\t\t--rf-color-success-bg: #052e16;
\t\t--rf-color-success-border: #166534;
\t}
}
`;
}

function generateThemeGlobalCss(): string {
	return `/* Global resets and base styles */
*,
*::before,
*::after {
\tbox-sizing: border-box;
}

body {
\tfont-family: var(--rf-font-sans);
\tcolor: var(--rf-color-text);
\tbackground-color: var(--rf-color-bg);
\tline-height: 1.6;
\t-webkit-font-smoothing: antialiased;
}
`;
}

function generateThemeTsconfig(): string {
	const config = {
		compilerOptions: {
			target: 'ES2022',
			module: 'ES2022',
			moduleResolution: 'bundler',
			declaration: true,
			outDir: 'dist',
			rootDir: 'src',
			strict: true,
			esModuleInterop: true,
			skipLibCheck: true,
		},
		include: ['src'],
	};
	return JSON.stringify(config, null, '\t') + '\n';
}

function generateThemeDefaultLayout(): string {
	return `<script lang="ts">
\timport { Renderer } from '@refrakt-md/svelte';

\tlet { regions, renderable }: {
\t\tregions: Record<string, { name: string; mode: string; content: any[] }>;
\t\trenderable: any;
\t} = $props();
</script>

{#if regions.header}
\t<header>
\t\t<Renderer node={regions.header.content} />
\t</header>
{/if}

<main>
\t<Renderer node={renderable} />
</main>
`;
}

function generateThemeCssCoverageTest(): string {
	return `import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import postcss from 'postcss';
import { themeConfig } from '../src/config.js';

const CSS_DIR = join(__dirname, '..', 'styles', 'runes');

/** Parse all CSS files and collect every .rf-* class selector */
function parseAllCssSelectors(): Set<string> {
\tconst selectors = new Set<string>();
\tif (!existsSync(CSS_DIR)) return selectors;

\tconst files = readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));
\tfor (const file of files) {
\t\tconst css = readFileSync(join(CSS_DIR, file), 'utf-8');
\t\tconst root = postcss.parse(css);
\t\troot.walkRules(rule => {
\t\t\tconst matches = rule.selector.matchAll(/\\.rf-[\\w-]+/g);
\t\t\tfor (const m of matches) {
\t\t\t\tselectors.add(m[0]);
\t\t\t}
\t\t});
\t}
\treturn selectors;
}

const allCssSelectors = parseAllCssSelectors();
const { prefix, runes } = themeConfig;

describe('Theme CSS coverage', () => {
\tit('block selectors exist for styled runes', () => {
\t\tconst allBlocks = [...new Set(Object.values(runes).map(c => c.block))];
\t\tconst styledBlocks = allBlocks.filter(block =>
\t\t\tallCssSelectors.has(\`.\${prefix}-\${block}\`)
\t\t);

\t\tconsole.log(\`CSS coverage: \${styledBlocks.length}/\${allBlocks.length} blocks\`);
\t\t// Start at 0% — increase this threshold as you add CSS
\t\texpect(styledBlocks.length).toBeGreaterThanOrEqual(0);
\t});
});
`;
}

function generateThemeKitchenSink(): string {
	return `---
title: Kitchen Sink
description: Preview of all major runes for theme development.
---

# Kitchen Sink

This page demonstrates all major rune types. Use it to preview your theme styles.

## Hints

{% hint type="note" %}
This is a **note** hint for general information.
{% /hint %}

{% hint type="warning" %}
This is a **warning** hint for cautionary messages.
{% /hint %}

{% hint type="caution" %}
This is a **caution** hint for dangerous actions.
{% /hint %}

{% hint type="check" %}
This is a **check** hint for success messages.
{% /hint %}

## Grid

{% grid columns=3 %}

**Fast**

Lightning-fast build times with incremental compilation.

---

**Flexible**

Supports multiple frameworks and output targets.

---

**Extensible**

Create custom runes and themes to match your brand.

{% /grid %}

## Accordion

{% accordion %}
### What is refrakt.md?
A documentation framework that transforms Markdown into rich, interactive pages.

### How do themes work?
Themes provide an identity transform layer (BEM classes, structure) and optional Svelte components for interactive runes.

### Can I create my own runes?
Yes! Define a schema in the runes package and add engine config to your theme.
{% /accordion %}

## Steps

{% steps %}
### Install dependencies
\`\`\`sh
npm install
\`\`\`

### Configure your theme
Edit \`src/config.ts\` to customize rune behavior and icons.

### Add CSS styles
Create CSS files in \`styles/runes/\` for each rune block.
{% /steps %}

## API Endpoint

{% api method="GET" path="/api/users" %}
Returns a list of all users.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| limit | number | Max results to return |
| offset | number | Pagination offset |
{% /api %}

## Tabs

{% tabs %}
{% tab title="npm" %}
\`\`\`sh
npm install @refrakt-md/svelte
\`\`\`
{% /tab %}

{% tab title="pnpm" %}
\`\`\`sh
pnpm add @refrakt-md/svelte
\`\`\`
{% /tab %}

{% tab title="yarn" %}
\`\`\`sh
yarn add @refrakt-md/svelte
\`\`\`
{% /tab %}
{% /tabs %}

## Code Block

\`\`\`ts title="example.ts"
import { themeConfig } from './config';

export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
`;
}

function generateThemeBaseCss(): string {
	return `/* Base styles — tokens + globals (no rune CSS) */
@import './tokens/base.css';
@import './tokens/dark.css';
@import './styles/global.css';
`;
}

function generateThemeTokensBridge(): string {
	return `@import '../index.css';
`;
}

// ─── Plan scaffolding ────────────────────────────────────────────────

export interface PlanScaffoldOptions {
	projectName: string;
	targetDir: string;
}

/**
 * Scaffold a planning-only project: minimal package.json + .gitignore,
 * then delegate the plan/ tree to @refrakt-md/plan's runInit.
 */
export function scaffoldPlan(options: PlanScaffoldOptions): void {
	const { projectName, targetDir } = options;

	if (existsSync(targetDir)) {
		throw new Error(`Directory "${targetDir}" already exists`);
	}

	mkdirSync(targetDir, { recursive: true });

	writeFileSync(path.join(targetDir, 'package.json'), generatePlanPackageJson(projectName));
	writeFileSync(path.join(targetDir, '.gitignore'), generatePlanGitignore());

	runInit({
		dir: path.join(targetDir, 'plan'),
		projectRoot: targetDir,
		noPackageJson: true,
	});
}

function generatePlanPackageJson(projectName: string): string {
	const v = `~${getRefraktVersion()}`;
	const pkg = {
		name: projectName,
		private: true,
		version: '0.0.1',
		type: 'module',
		scripts: {
			plan: 'refrakt plan',
			'plan:next': 'refrakt plan next',
			'plan:status': 'refrakt plan status',
			'plan:validate': 'refrakt plan validate',
		},
		devDependencies: {
			'@refrakt-md/cli': v,
			'@refrakt-md/plan': v,
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

function generatePlanGitignore(): string {
	return `node_modules/
.DS_Store
*.log
.plan-cache.json
.plan-history-cache.json
`;
}

// ─── Plan-site scaffolding (runnable site dogfood, SPEC-071) ─────────

export interface PlanSiteScaffoldOptions {
	projectName: string;
	targetDir: string;
	target: ScaffoldTarget;
}

/**
 * Scaffold a runnable plan site (SPEC-071 / WORK-271): a full adapter project
 * whose `refrakt.config.json` declares the plan plugin + `entityRoutes` rules
 * and whose `content/` dir holds the dashboards + layout. Plan entity sources
 * live in `plan/` (seeded via runInit) and are reached through the registry,
 * not as content pages. Layout mirrors a regular `--type site` scaffold so
 * the dev server, build, and conventions feel identical.
 */
export async function scaffoldPlanSite(options: PlanSiteScaffoldOptions): Promise<void> {
	const { projectName, targetDir, target } = options;

	// Lay down the adapter shell first — same scaffolders sites use. They
	// write a default refrakt.config.json (and a `content/` dir with a sample
	// page) which we overwrite below.
	await scaffold({
		projectName,
		targetDir,
		theme: '@refrakt-md/lumina',
		target,
	});

	// Replace the adapter's default config with the plan-site shape.
	writeFileSync(
		path.join(targetDir, 'refrakt.config.json'),
		generatePlanSiteRefraktConfig(adapterTargetString(target)),
	);

	// Add @refrakt-md/plan + @refrakt-md/cli to the project dependencies and
	// the plan:* scripts to package.json. Adapter scaffolders only seed the
	// marketing plugin, so we layer the plan plugin in after the fact.
	mergePlanDepsIntoPackageJson(targetDir, target);

	// Seed plan/ with one of each entity type so the dev server has something
	// to render immediately. noPackageJson: true so the existing scripts and
	// pinned versions survive (we already merged what we need).
	runInit({
		dir: path.join(targetDir, 'plan'),
		projectRoot: targetDir,
		noPackageJson: true,
	});

	// Overwrite the adapter's sample content with the plan dashboards. The
	// content/ dir already exists from the adapter scaffold; we replace its
	// contents so the project mirrors a regular `--type site` shape.
	const contentDir = path.join(targetDir, 'content');
	mkdirSync(contentDir, { recursive: true });
	rmContentDirSamples(contentDir);
	writeFileSync(path.join(contentDir, '_layout.md'), generatePlanSiteLayoutMd());
	writeFileSync(path.join(contentDir, 'index.md'), generatePlanSiteIndexMd());
	writeFileSync(path.join(contentDir, 'work.md'), generatePlanSiteWorkMd());
	writeFileSync(path.join(contentDir, 'specs.md'), generatePlanSiteSpecsMd());
	writeFileSync(path.join(contentDir, 'bugs.md'), generatePlanSiteBugsMd());
	writeFileSync(path.join(contentDir, 'decisions.md'), generatePlanSiteDecisionsMd());
	writeFileSync(path.join(contentDir, 'milestones.md'), generatePlanSiteMilestonesMd());
}

/** Remove the marketing-flavoured sample files the adapter scaffold drops into
 *  `content/` (typically `index.md` and a hello-world page) before we write the
 *  plan dashboards in their place. Best-effort — we only touch known sample
 *  filenames, leaving anything else in the dir untouched. */
function rmContentDirSamples(contentDir: string): void {
	for (const name of ['index.md', 'hello.md', 'about.md']) {
		const p = path.join(contentDir, name);
		if (existsSync(p)) {
			try { writeFileSync(p, ''); } catch { /* ignore */ }
		}
	}
}

/** Convert a ScaffoldTarget into the `target` string used in refrakt.config.json
 *  (SvelteKit projects record `svelte` rather than `sveltekit`). */
function adapterTargetString(target: ScaffoldTarget): string {
	return target === 'sveltekit' ? 'svelte' : target;
}

/** Plan-site refrakt.config.json — the plan plugin plus the entityRoutes block
 *  from SPEC-071. `contentDir` is `./content` (dashboards only); plan/
 *  entities are registry sources, not content pages. */
function generatePlanSiteRefraktConfig(target: string): string {
	const config = {
		$schema: `https://refrakt.md/schemas/${getRefraktSchemaVersion()}/refrakt.config.schema.json`,
		plan: { dir: 'plan' },
		sites: {
			main: {
				contentDir: './content',
				theme: '@refrakt-md/lumina',
				target,
				plugins: ['@refrakt-md/plan'],
				routeRules: [
					{ pattern: '**', layout: 'docs' },
				],
				entityRoutes: [
					{ type: 'spec',      url: '/specs/{id}/',        title: '{title}',         render: '{% expand $item.id /%}' },
					{ type: 'work',      url: '/work/{id}/',         title: '{id} — {title}',  render: '{% expand $item.id /%}' },
					{ type: 'bug',       url: '/bugs/{id}/',         title: '{id} — {title}',  render: '{% expand $item.id /%}' },
					{ type: 'decision',  url: '/decisions/{id}/',    title: '{title}',         render: '{% expand $item.id /%}' },
					{ type: 'milestone', url: '/milestones/{name}/', title: '{name}',          render: '{% expand $item.name /%}' },
				],
			},
		},
	};
	return JSON.stringify(config, null, '\t') + '\n';
}

/** Adapter scaffolders seed `@refrakt-md/marketing` and adapter-specific deps.
 *  Plan-site projects also need `@refrakt-md/plan` (for runes, register hook,
 *  entityRoutes wiring) and `@refrakt-md/cli` (so `npx refrakt plan ...`
 *  works for authoring). Add convenience scripts so users don't have to
 *  remember the long `npx` invocations. */
function mergePlanDepsIntoPackageJson(targetDir: string, _target: ScaffoldTarget): void {
	const pkgPath = path.join(targetDir, 'package.json');
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
		scripts?: Record<string, string>;
	};
	const v = `~${getRefraktVersion()}`;
	pkg.dependencies = { ...(pkg.dependencies ?? {}), '@refrakt-md/plan': v };
	pkg.devDependencies = { ...(pkg.devDependencies ?? {}), '@refrakt-md/cli': v };
	pkg.scripts = {
		...(pkg.scripts ?? {}),
		plan: 'refrakt plan',
		'plan:next': 'refrakt plan next',
		'plan:status': 'refrakt plan status',
		'plan:validate': 'refrakt plan validate',
	};
	writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
}

function generatePlanSiteLayoutMd(): string {
	return `---
tint-mode: auto
tint-lock: false
---
{% layout %}
{% region name="nav" %}
{% nav collapsible=true %}
- [Overview](/)
- [Specs](/specs)
- [Work](/work)
- [Bugs](/bugs)
- [Decisions](/decisions)
- [Milestones](/milestones)
{% /nav %}
{% /region %}

{% region name="pagination" %}
{% pagination auto=true /%}
{% /region %}
{% /layout %}
`;
}

function generatePlanSiteIndexMd(): string {
	return `---
title: Plan
description: Live plan dashboard — progress, recent activity, ready work, and architecture decisions.
---

# Plan

A live dashboard built from the \`plan/\` tree your project commits to git. Every entity below resolves through the standard refrakt pipeline — \`entityRoutes\` generates a detail page per spec/work/bug/decision/milestone, and \`collection\` lists them here.

## Progress

{% plan-progress /%}

## Recent activity

{% plan-activity limit=15 /%}

## Ready work

{% backlog filter="status:ready" sort="priority" group="priority" /%}

## Recent decisions

{% decision-log sort="date" /%}
`;
}

function generatePlanSiteWorkMd(): string {
	return `---
title: Work
description: Every work item, grouped by status.
---

# Work

{% collection type="work" group="status" sort="priority" /%}
`;
}

function generatePlanSiteSpecsMd(): string {
	return `---
title: Specs
description: All specifications, grouped by status.
---

# Specs

{% collection type="spec" group="status" sort="id" /%}
`;
}

function generatePlanSiteBugsMd(): string {
	return `---
title: Bugs
description: Open and resolved bug reports.
---

# Bugs

{% collection type="bug" group="status" sort="severity" /%}
`;
}

function generatePlanSiteDecisionsMd(): string {
	return `---
title: Decisions
description: Architecture decision records.
---

# Decisions

{% decision-log sort="date" /%}

## All decisions

{% collection type="decision" sort="id" /%}
`;
}

function generatePlanSiteMilestonesMd(): string {
	return `---
title: Milestones
description: Release targets and their progress.
---

# Milestones

{% collection type="milestone" sort="-name" /%}
`;
}

// ─── Preset-pack scaffold (SPEC-116 §2, ADR-023) ────────────────────────────

export interface PresetPackScaffoldOptions {
	packName: string;
	targetDir: string;
	scope?: string;
}

/** Scaffold a declarative **preset pack** (SPEC-111 §6 JSON carrier). Because a
 *  JSON preset needs no build, this package is contract-valid the moment it is
 *  written (SPEC-116 §4) — no compile step. Ships a `presets.json` manifest, one
 *  `syntax`-scoped example preset (the universal, safest default), and the
 *  ADR-023 peer/compat wiring. */
export function scaffoldPresetPack(options: PresetPackScaffoldOptions): void {
	const { packName, targetDir, scope } = options;
	if (existsSync(targetDir)) {
		throw new Error(`Directory already exists: ${targetDir}`);
	}
	const fullName = scope ? `${scope}/${packName}` : packName;
	const peer = refraktPeerRange();

	mkdirSync(path.join(targetDir, 'src'), { recursive: true });

	const pkg = {
		name: fullName,
		version: '0.1.0',
		description: `${packName} — a refrakt preset pack`,
		type: 'module',
		// JSON carrier: no build output; presets are shipped as source.
		exports: {
			'./presets.json': './presets.json',
			'./ember': './src/ember.json',
		},
		files: ['presets.json', 'src'],
		scripts: {
			// Validate the pack manifest against the installed refrakt CLI.
			validate: 'refrakt theme presets validate --pack .',
		},
		// ADR-023: depend on @refrakt-md/* as peers (not bundled), with a matching
		// devDependency so the pack can be validated/built in isolation.
		peerDependencies: {
			'@refrakt-md/types': peer,
		},
		devDependencies: {
			'@refrakt-md/cli': peer,
			'@refrakt-md/types': peer,
		},
	};
	writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(pkg, null, '\t') + '\n');

	const manifest = {
		name: fullName,
		// ADR-023 compatibility range, pinned to the scaffolding refrakt minor.
		refrakt: peer,
		presets: [
			{
				id: 'ember',
				title: 'Ember',
				scope: 'syntax',
				module: './src/ember.json',
			},
		],
	};
	writeFileSync(path.join(targetDir, 'presets.json'), JSON.stringify(manifest, null, '\t') + '\n');

	// Example preset — a `syntax`-scoped ThemeTokensConfig (universal). The
	// `$schema` pointer drives editor validation/autocomplete (WORK-458).
	const ember = {
		$schema: tokenSchemaUrl(),
		syntax: {
			keyword: '#c2410c',
			function: '#b45309',
			string: '#3f6212',
			number: '#9a3412',
			comment: '#78716c',
			type: '#92400e',
			variable: '#1c1917',
		},
	};
	writeFileSync(path.join(targetDir, 'src', 'ember.json'), JSON.stringify(ember, null, '\t') + '\n');

	writeFileSync(
		path.join(targetDir, 'README.md'),
		`# ${fullName}

A refrakt **preset pack** — a collection of \`ThemeTokensConfig\` presets shipped
independently of any theme (SPEC-111).

## Authoring

Presets are declarative JSON (no build step). Add a \`.json\` file under \`src/\`
and an entry in \`presets.json\`:

- \`scope: "syntax"\` — recolours only code/syntax tokens; works under any theme.
- \`scope: "palette"\` — also sets chrome tokens; tune it to a canvas and list the
  theme(s) it was designed for under \`tunedFor\`.

Each preset's \`$schema\` enables editor validation against the universal token
contract.

## Validate

\`\`\`bash
npm run validate   # refrakt theme presets validate --pack .
\`\`\`

## Use in a site

\`\`\`bash
refrakt theme presets install ${fullName} --use ember
\`\`\`
`,
	);
}

// ─── Plugin scaffold (SPEC-116 §2, ADR-023) ─────────────────────────────────

export interface PluginScaffoldOptions {
	pluginName: string;
	targetDir: string;
	scope?: string;
}

/** Convert a package name to a safe JS identifier for the Plugin export var. */
function toIdentifier(name: string): string {
	const camel = name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
	return /^[a-zA-Z_]/.test(camel) ? camel : `plugin${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
}

/** Scaffold a **plugin** package (SPEC-116 §2): a `Plugin` with one example
 *  rune (`callout`) that builds and renders under the identity transform, its
 *  `theme.runes` config, a fixture, and ADR-023 peer/compat wiring. */
export function scaffoldPlugin(options: PluginScaffoldOptions): void {
	const { pluginName, targetDir, scope } = options;
	if (existsSync(targetDir)) {
		throw new Error(`Directory "${targetDir}" already exists`);
	}
	const fullName = scope ? `${scope}/${pluginName}` : pluginName;
	const ident = toIdentifier(pluginName);
	const peer = refraktPeerRange();

	mkdirSync(path.join(targetDir, 'src', 'tags'), { recursive: true });
	mkdirSync(path.join(targetDir, 'styles'), { recursive: true });

	const pkg = {
		name: fullName,
		version: '0.1.0',
		type: 'module',
		main: 'dist/index.js',
		types: 'dist/index.d.ts',
		exports: {
			'.': { types: './dist/index.d.ts', default: './dist/index.js' },
			'./styles/*.css': './styles/*.css',
		},
		files: ['dist', 'styles'],
		scripts: { build: 'tsc' },
		// ADR-023: @refrakt-md/* as peers (resolve against the host site), mirrored
		// to devDependencies so the package type-checks/builds in isolation.
		peerDependencies: {
			'@refrakt-md/runes': peer,
			'@refrakt-md/transform': peer,
			'@refrakt-md/types': peer,
		},
		dependencies: {
			'@markdoc/markdoc': '^0.4.0',
		},
		devDependencies: {
			'@refrakt-md/runes': peer,
			'@refrakt-md/transform': peer,
			'@refrakt-md/types': peer,
			typescript: '^5.4.0',
		},
	};
	writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(pkg, null, '\t') + '\n');

	writeFileSync(path.join(targetDir, 'tsconfig.json'), JSON.stringify({
		compilerOptions: {
			target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler',
			declaration: true, outDir: 'dist', rootDir: 'src',
			strict: true, esModuleInterop: true, skipLibCheck: true,
			resolveJsonModule: true,
		},
		include: ['src'],
	}, null, '\t') + '\n');

	writeFileSync(path.join(targetDir, 'src', 'tags', 'callout.ts'), `import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
\tcreateContentModelSchema,
\tcreateComponentRenderable,
\tasNodes,
\tRenderableNodeCursor,
} from '@refrakt-md/runes';

/** Example rune: a titled callout/aside with a \`tone\` modifier. The list/heading
 *  primitives are reinterpreted — here a heading-less body is wrapped and a
 *  \`title\` attribute becomes the callout's header. Model your own runes on this. */
export const callout = createContentModelSchema({
\tattributes: {
\t\ttitle: { type: String, required: false, description: 'Heading shown at the top of the callout.' },
\t\ttone: { type: String, required: false, description: 'Visual tone, e.g. note | tip | warning.' },
\t},
\tcontentModel: {
\t\ttype: 'sequence',
\t\tfields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
\t},
\ttransform(resolved, attrs, config) {
\t\tconst titleTag = new Tag('span', {}, [attrs.title ?? 'Note']);
\t\tconst toneMeta = new Tag('meta', { content: String(attrs.tone ?? 'note') });
\t\tconst body = new RenderableNodeCursor(
\t\t\tMarkdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
\t\t).wrap('div');

\t\treturn createComponentRenderable({
\t\t\trune: 'callout',
\t\t\ttag: 'aside',
\t\t\tproperty: 'description',
\t\t\tproperties: { tone: toneMeta },
\t\t\trefs: {
\t\t\t\ttitle: titleTag,
\t\t\t\tbody: body.tag('div'),
\t\t\t},
\t\t\tchildren: [titleTag, toneMeta, body.next()],
\t\t});
\t},
});
`);

	writeFileSync(path.join(targetDir, 'src', 'config.ts'), `import type { RuneConfig } from '@refrakt-md/transform';

/** Identity-transform config for this plugin's runes, keyed by PascalCase
 *  typeName. The engine reads this to add BEM classes, modifiers, and structure. */
export const config: Record<string, RuneConfig> = {
\tCallout: {
\t\tblock: 'callout',
\t\t// \`tone\` reads the meta tag → adds .rf-callout--<tone> + [data-tone].
\t\tmodifiers: {
\t\t\ttone: { source: 'meta', default: 'note' },
\t\t},
\t\t// Named refs become .rf-callout__title / .rf-callout__body.
\t\tautoLabel: { span: 'title', div: 'body' },
\t},
};
`);

	writeFileSync(path.join(targetDir, 'src', 'index.ts'), `import type { Plugin } from '@refrakt-md/types';
import { callout } from './tags/callout.js';
import { config } from './config.js';

export const ${ident}: Plugin = {
\tname: '${pluginName}',
\tdisplayName: '${pluginName.charAt(0).toUpperCase() + pluginName.slice(1)}',
\tversion: '0.1.0',
\trunes: {
\t\tcallout: {
\t\t\ttransform: callout,
\t\t\tdescription: 'A titled callout/aside with a tone modifier.',
\t\t\tcategory: 'Semantic',
\t\t\tsnippet: ['{% callout title="\${1:Heads up}" tone="\${2|note,tip,warning|}" %}', '\${3:Body text}', '{% /callout %}'],
\t\t\tfixture: '{% callout title="Heads up" tone="tip" %}\\nThis is an example callout rune.\\n{% /callout %}',
\t\t},
\t},
\ttheme: {
\t\trunes: config as unknown as Record<string, Record<string, unknown>>,
\t},
};

export default ${ident};
`);

	writeFileSync(path.join(targetDir, 'styles', 'callout.css'), `.rf-callout {
\tdisplay: block;
\tpadding: var(--rf-space-4, 1rem);
\tborder-inline-start: 3px solid var(--rf-color-primary, #3b82f6);
\tborder-radius: var(--rf-radius, 0.5rem);
\tbackground: var(--rf-color-surface, #f8fafc);
\tcolor: var(--rf-color-text, inherit);
}

.rf-callout__title {
\tfont-weight: var(--rf-weight-semibold, 600);
\tmargin-block-end: var(--rf-space-2, 0.5rem);
}

.rf-callout[data-tone='warning'] {
\tborder-inline-start-color: var(--rf-color-warning, #f59e0b);
}

.rf-callout[data-tone='tip'] {
\tborder-inline-start-color: var(--rf-color-success, #10b981);
}
`);

	writeFileSync(path.join(targetDir, 'README.md'), `# ${fullName}

A refrakt **plugin** — a package of custom runes (SPEC-116, plugin authoring guide).

## What's here

- \`src/tags/callout.ts\` — an example rune built with \`createContentModelSchema\`
  + \`createComponentRenderable\`. It renders under the identity transform with no
  framework code.
- \`src/config.ts\` — the \`RuneConfig\` the engine reads (BEM block, modifiers).
- \`styles/callout.css\` — per-rune CSS targeting the generated BEM selectors.
- \`src/index.ts\` — the \`Plugin\` export wiring runes + theme config.

## Develop

\`\`\`bash
npm install
npm run build
npx refrakt inspect callout    # see the emitted HTML/BEM
\`\`\`

## Use in a site

Add \`"${fullName}"\` to a site's \`plugins\` in \`refrakt.config.json\`.
`);
}
