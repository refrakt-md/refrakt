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
			'@refrakt-md/content': '^0.1.0',
			'@refrakt-md/runes': '^0.1.0',
			'@refrakt-md/svelte': '^0.1.0',
			'@refrakt-md/sveltekit': '^0.1.0',
			[theme]: '^0.1.0',
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
		target: 'sveltekit',
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
