import { mkdirSync, cpSync, writeFileSync, existsSync, renameSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

function getRefraktVersion(): string {
	const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
	return pkg.version;
}

export interface ScaffoldOptions {
	projectName: string;
	targetDir: string;
	theme: string;
}

export function scaffold(options: ScaffoldOptions): void {
	const { projectName, targetDir, theme } = options;

	if (existsSync(targetDir)) {
		throw new Error(`Directory "${targetDir}" already exists`);
	}

	mkdirSync(targetDir, { recursive: true });

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

	// Rename dotfiles (npm strips .gitignore from published tarballs)
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

	// Generate interpolated files
	writeFileSync(
		path.join(targetDir, 'package.json'),
		generatePackageJson(projectName, theme),
	);

	writeFileSync(
		path.join(targetDir, 'refrakt.config.json'),
		generateRefraktConfig(theme),
	);

	writeFileSync(
		path.join(targetDir, 'README.md'),
		generateReadme(projectName),
	);
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
			build: 'vite build',
			preview: 'vite preview',
			prepare: "svelte-kit sync || echo ''",
			check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
		},
		dependencies: {
			'@refrakt-md/content': v,
			'@refrakt-md/highlight': v,
			'@refrakt-md/runes': v,
			'@refrakt-md/svelte': v,
			'@refrakt-md/sveltekit': v,
			'@refrakt-md/types': v,
			[theme]: v,
			'@markdoc/markdoc': '^0.4.0',
		},
		devDependencies: {
			'@sveltejs/adapter-static': '^3.0.0',
			'@sveltejs/kit': '^2.50.0',
			'@sveltejs/vite-plugin-svelte': '^6.0.0',
			'@tailwindcss/vite': '^4.0.0',
			'svelte': '^5.0.0',
			'svelte-check': '^4.0.0',
			'tailwindcss': '^4.0.0',
			'typescript': '^5.4.0',
			'vite': '^7.0.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

function generateRefraktConfig(theme: string): string {
	const config = {
		contentDir: './content',
		theme,
		target: 'svelte',
		routeRules: [
			{ pattern: '**', layout: 'default' },
		],
	};
	return JSON.stringify(config, null, '\t') + '\n';
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
`;
}

// ─── Theme scaffolding ───────────────────────────────────────────────

export interface ThemeScaffoldOptions {
	themeName: string;
	targetDir: string;
	scope?: string;
}

export function scaffoldTheme(options: ThemeScaffoldOptions): void {
	const { themeName, targetDir, scope } = options;

	if (existsSync(targetDir)) {
		throw new Error(`Directory "${targetDir}" already exists`);
	}

	const packageName = scope ? `${scope}/${themeName}` : themeName;

	mkdirSync(path.join(targetDir, 'src'), { recursive: true });
	mkdirSync(path.join(targetDir, 'svelte', 'layouts'), { recursive: true });
	mkdirSync(path.join(targetDir, 'tokens'), { recursive: true });
	mkdirSync(path.join(targetDir, 'styles', 'runes'), { recursive: true });
	mkdirSync(path.join(targetDir, 'test'), { recursive: true });
	mkdirSync(path.join(targetDir, 'preview'), { recursive: true });

	writeFileSync(
		path.join(targetDir, 'package.json'),
		generateThemePackageJson(packageName),
	);

	writeFileSync(
		path.join(targetDir, 'src', 'config.ts'),
		generateThemeConfig(),
	);

	writeFileSync(
		path.join(targetDir, 'svelte', 'index.ts'),
		generateThemeSvelteIndex(),
	);

	writeFileSync(
		path.join(targetDir, 'manifest.json'),
		generateThemeManifest(packageName),
	);

	writeFileSync(
		path.join(targetDir, 'index.css'),
		generateThemeIndexCss(),
	);

	writeFileSync(
		path.join(targetDir, 'tokens', 'base.css'),
		generateThemeBaseTokens(),
	);

	writeFileSync(
		path.join(targetDir, 'tokens', 'dark.css'),
		generateThemeDarkTokens(),
	);

	writeFileSync(
		path.join(targetDir, 'styles', 'global.css'),
		generateThemeGlobalCss(),
	);

	writeFileSync(
		path.join(targetDir, 'tsconfig.json'),
		generateThemeTsconfig(),
	);

	writeFileSync(
		path.join(targetDir, 'svelte', 'layouts', 'DefaultLayout.svelte'),
		generateThemeDefaultLayout(),
	);

	writeFileSync(
		path.join(targetDir, 'test', 'css-coverage.test.ts'),
		generateThemeCssCoverageTest(),
	);

	writeFileSync(
		path.join(targetDir, 'preview', 'kitchen-sink.md'),
		generateThemeKitchenSink(),
	);

	writeFileSync(
		path.join(targetDir, 'base.css'),
		generateThemeBaseCss(),
	);

	writeFileSync(
		path.join(targetDir, 'svelte', 'tokens.css'),
		generateThemeTokensBridge(),
	);
}

function generateThemePackageJson(packageName: string): string {
	const pkg = {
		name: packageName,
		version: '0.1.0',
		type: 'module',
		main: 'dist/config.js',
		types: 'dist/config.d.ts',
		exports: {
			'.': './index.css',
			'./base.css': './base.css',
			'./transform': {
				types: './dist/config.d.ts',
				default: './dist/config.js',
			},
			'./svelte': {
				svelte: './svelte/index.ts',
				default: './svelte/index.ts',
			},
			'./manifest': './manifest.json',
			'./styles/runes/*.css': './styles/runes/*.css',
			'./svelte/tokens.css': './svelte/tokens.css',
		},
		files: [
			'dist',
			'base.css',
			'index.css',
			'tokens',
			'styles',
			'manifest.json',
			'svelte',
		],
		scripts: {
			build: 'tsc',
			test: 'vitest run',
		},
		dependencies: {
			'@refrakt-md/theme-base': `~${getRefraktVersion()}`,
			'@refrakt-md/transform': `~${getRefraktVersion()}`,
			'@refrakt-md/types': `~${getRefraktVersion()}`,
			'@refrakt-md/svelte': `~${getRefraktVersion()}`,
		},
		devDependencies: {
			vitest: '^3.0.0',
			postcss: '^8.4.0',
		},
	};
	return JSON.stringify(pkg, null, '\t') + '\n';
}

function generateThemeConfig(): string {
	return `import { baseConfig, mergeThemeConfig } from '@refrakt-md/theme-base';

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
import { registry } from '@refrakt-md/theme-base/svelte/registry';
import { elements } from '@refrakt-md/theme-base/svelte/elements';
import DefaultLayout from './layouts/DefaultLayout.svelte';

export { default as manifest } from '../manifest.json';

export const theme: SvelteTheme = {
\tmanifest: manifest as any,
\tlayouts: { default: DefaultLayout },
\tcomponents: registry,
\telements,
};

export { registry };
export { behaviors } from '@refrakt-md/theme-base/svelte/behaviors';
export { default as DefaultLayout } from './layouts/DefaultLayout.svelte';
`;
}

function generateThemeManifest(packageName: string): string {
	const manifest = {
		name: packageName,
		version: '0.1.0',
		target: 'svelte',
		designTokens: './tokens/base.css',
		layouts: {
			default: {
				component: './svelte/layouts/DefaultLayout.svelte',
				regions: ['content'],
			},
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

\t/* Primary color scale */
\t--rf-color-primary-50: #f0f9ff;
\t--rf-color-primary-100: #e0f2fe;
\t--rf-color-primary-500: #3b82f6;
\t--rf-color-primary-600: #2563eb;
\t--rf-color-primary-900: #1e3a5f;

\t/* Core palette */
\t--rf-color-text: #1a1a2e;
\t--rf-color-muted: #64748b;
\t--rf-color-border: #e2e8f0;
\t--rf-color-bg: #ffffff;
\t--rf-color-primary: var(--rf-color-primary-500);
\t--rf-color-primary-hover: var(--rf-color-primary-600);

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
