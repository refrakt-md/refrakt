import { mkdirSync, cpSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

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
			'@refrakt-md/content': '^0.4.0',
			'@refrakt-md/highlight': '^0.4.0',
			'@refrakt-md/runes': '^0.4.0',
			'@refrakt-md/svelte': '^0.4.0',
			'@refrakt-md/sveltekit': '^0.4.0',
			'@refrakt-md/types': '^0.4.0',
			[theme]: '^0.4.0',
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
	mkdirSync(path.join(targetDir, 'svelte'), { recursive: true });
	mkdirSync(path.join(targetDir, 'tokens'), { recursive: true });
	mkdirSync(path.join(targetDir, 'styles', 'runes'), { recursive: true });

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
			'./transform': {
				types: './dist/config.d.ts',
				default: './dist/config.js',
			},
			'./svelte': {
				svelte: './svelte/index.ts',
				default: './svelte/index.ts',
			},
			'./manifest': './manifest.json',
		},
		files: [
			'dist',
			'svelte',
			'tokens',
			'styles',
			'index.css',
			'manifest.json',
		],
		scripts: {
			build: 'tsc',
		},
		dependencies: {
			'@refrakt-md/theme-base': '^0.4.0',
			'@refrakt-md/transform': '^0.4.0',
			'@refrakt-md/types': '^0.4.0',
			'@refrakt-md/svelte': '^0.4.0',
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
	return `export { registry } from '@refrakt-md/theme-base/svelte/registry';
export { elements } from '@refrakt-md/theme-base/svelte/elements';
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
				component: './svelte/layouts/Default.svelte',
				regions: ['content'],
			},
		},
		routeRules: [
			{ pattern: '**', layout: 'default' },
		],
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
