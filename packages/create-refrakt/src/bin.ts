#!/usr/bin/env node

import { scaffold, scaffoldPlan, scaffoldPlanSite, scaffoldTheme, scaffoldPresetPack, scaffoldPlugin } from './scaffold.js';
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

type ProjectType = 'site' | 'theme' | 'plan' | 'preset-pack' | 'plugin';

let projectName: string | undefined;
let theme = '@refrakt-md/lumina';
let type: ProjectType = 'site';
let typeExplicit = false;
let target: ScaffoldTarget | undefined;
let targetExplicit = false;
let themeLayer: 'svelte' | undefined;
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
		if (val !== 'site' && val !== 'theme' && val !== 'plan' && val !== 'preset-pack' && val !== 'plugin') {
			console.error('Error: --type must be one of: site, theme, plan, preset-pack, plugin');
			process.exit(1);
		}
		type = val;
		typeExplicit = true;
	} else if (arg === '--target') {
		const val = args[++i];
		// `--target svelte` (with --type theme) opts into the framework component
		// layer (ADR-024) — distinct from a site's adapter target.
		if (val === 'svelte') {
			themeLayer = 'svelte';
		} else if (VALID_TARGETS.includes(val as ScaffoldTarget)) {
			target = val as ScaffoldTarget;
			targetExplicit = true;
		} else {
			console.error(`Error: --target must be one of: ${VALID_TARGETS.join(', ')} (sites), or "svelte" (theme component layer)`);
			process.exit(1);
		}
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

// Infer type from other flags so users who pass --target/--theme don't get
// prompted for a project type they've already implicitly chosen.
if (!typeExplicit && (targetExplicit || theme !== '@refrakt-md/lumina')) {
	typeExplicit = true;
}
if (!typeExplicit && scope) {
	type = 'theme';
	typeExplicit = true;
}
// `--target svelte` is a theme-only flag; infer the theme type from it.
if (!typeExplicit && themeLayer) {
	type = 'theme';
	typeExplicit = true;
}

function printUsage(): void {
	console.log(`
Usage: create-refrakt [name] [options]

Options:
  --type <site|theme|plan|preset-pack>  What to create (default: site)
  --target <target>            Sites: adapter (${VALID_TARGETS.join(', ')}); required.
                               Plan: turns it into a runnable plan site.
                               Theme: "svelte" opts into a component layer
                               (default: framework-agnostic, ADR-024).
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
  npx create-refrakt my-plugin --type plugin --scope @my-org
  npx create-refrakt my-presets --type preset-pack
  npx create-refrakt my-plan --type plan
  npx create-refrakt my-plan --type plan --target sveltekit
`);
}

function validateFlagCombos(): void {
	if (type === 'plan') {
		const rejected: string[] = [];
		if (theme !== '@refrakt-md/lumina') rejected.push('--theme');
		if (scope) rejected.push('--scope');
		if (rejected.length > 0) {
			console.error(
				`Error: ${rejected.join(', ')} cannot be used with --type plan\n`
			);
			process.exit(1);
		}
	}
	// A site adapter target (--target sveltekit|astro|…) is invalid for packages.
	if ((type === 'theme' || type === 'preset-pack' || type === 'plugin') && targetExplicit) {
		console.error(`Error: a site adapter --target cannot be used with --type ${type}\n`);
		process.exit(1);
	}
	// The theme component-layer flag (--target svelte) is theme-only.
	if (themeLayer && type !== 'theme') {
		console.error('Error: --target svelte (theme component layer) requires --type theme\n');
		process.exit(1);
	}
	if (type !== 'theme' && type !== 'preset-pack' && type !== 'plugin' && scope) {
		console.error('Error: --scope can only be used with publishable packages (--type theme | preset-pack | plugin)\n');
		process.exit(1);
	}
}

async function run(): Promise<void> {
	validateFlagCombos();

	const needsPrompt =
		!projectName || !typeExplicit || (type === 'site' && !targetExplicit);

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

		if (!typeExplicit) {
			const selected = await select({
				message: 'What do you want to create?',
				options: [
					{ value: 'site', label: 'Site', hint: 'full refrakt.md site with a framework adapter' },
					{ value: 'theme', label: 'Theme', hint: 'publishable theme package' },
					{ value: 'preset-pack', label: 'Preset pack', hint: 'distributable token presets (JSON)' },
					{ value: 'plugin', label: 'Plugin', hint: 'custom runes package' },
					{ value: 'plan', label: 'Planning only', hint: 'specs, work items, decisions, milestones' },
				],
			});

			if (isCancel(selected)) {
				cancel('Cancelled.');
				process.exit(0);
			}

			type = selected as ProjectType;
			typeExplicit = true;
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

		const label =
			type === 'theme'
				? 'theme'
				: type === 'plan'
					? targetExplicit
						? `${TARGET_LABELS[target!]} plan site`
						: 'planning project'
					: `${TARGET_LABELS[target!]} site`;
		outro(`Creating ${label}: ${projectName}`);
	} else if (!projectName) {
		console.error('Error: Missing project name\n');
		printUsage();
		process.exit(1);
	}

	// Default target for sites when still unset (non-interactive).
	if (type === 'site' && !target) {
		target = 'sveltekit';
	}

	const targetDir = path.resolve(process.cwd(), projectName!);

	try {
		if (type === 'theme') {
			scaffoldTheme({ themeName: projectName!, targetDir, scope, target: themeLayer });
		} else if (type === 'preset-pack') {
			scaffoldPresetPack({ packName: projectName!, targetDir, scope });
		} else if (type === 'plugin') {
			scaffoldPlugin({ pluginName: projectName!, targetDir, scope });
		} else if (type === 'plan') {
			if (targetExplicit) {
				await scaffoldPlanSite({ projectName: projectName!, targetDir, target: target! });
			} else {
				scaffoldPlan({ projectName: projectName!, targetDir });
			}
		} else {
			await scaffold({ projectName: projectName!, targetDir, theme, target });
		}
	} catch (err) {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	}

	if (type === 'theme') {
		console.log(`
Done! Your ${themeLayer ? `${themeLayer}-targeted` : 'framework-agnostic'} refrakt.md theme package is ready.

Next steps:

  cd ${projectName}
  npm install
  npm run build

Then use it in a site:

  {
    "theme": "${scope ? `${scope}/${projectName}` : projectName}"
  }
${themeLayer ? '' : `
This theme is framework-agnostic — it renders under any adapter. To add a
Svelte component layer, re-scaffold with \`--target svelte\`.
`}
Run \`refrakt scaffold-css\` to generate CSS stubs for all runes.
`);
	} else if (type === 'preset-pack') {
		console.log(`
Done! Your refrakt.md preset pack is ready.

Presets are declarative JSON — no build step. Next steps:

  cd ${projectName}
  npm install
  npm run validate     # refrakt theme presets validate --pack .

Add presets under src/*.json + an entry in presets.json, then publish.
Install into a site with:

  refrakt theme presets install ${scope ? `${scope}/${projectName}` : projectName} --use ember
`);
	} else if (type === 'plugin') {
		console.log(`
Done! Your refrakt.md plugin package is ready.

Next steps:

  cd ${projectName}
  npm install
  npm run build
  npx refrakt inspect callout    # see the example rune's HTML/BEM

Add runes under src/tags/*.ts + entries in src/index.ts, then use it in a site
by adding "${scope ? `${scope}/${projectName}` : projectName}" to the site's plugins.
`);
	} else if (type === 'plan') {
		if (targetExplicit) {
			console.log(`
Done! Your refrakt.md plan site is ready (target: ${target}).

Next steps:

  cd ${projectName}
  npm install
  npm run dev

Plan content lives in:

  plan/        — entity sources (specs, work, decisions, milestones)
  plan-site/   — dashboards + layout (authored Markdoc pages)

The site reads plan/ through the registry; entityRoutes generates a
detail page per entity, and the dashboards in plan-site/ compose them
via the collection rune.

Documentation: https://refrakt.md/docs/plan
`);
		} else {
			console.log(`
Done! Your refrakt.md planning project is ready.

Next steps:

  cd ${projectName}
  npm install
  npx refrakt plan next

Useful commands:

  npm run plan:status     Overview of all plan items
  npm run plan:next       Find the next ready work item
  npx refrakt plan create work --title "..."
  npx refrakt plan update <id> --status in-progress

Documentation: https://refrakt.md/docs/plan
`);
		}
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

${devCommands[target!]}

Your site renders Lumina's neutral default — a quiet warm-neutral
palette designed to disappear behind your content. Two presets are
available if you want a starting palette:

  // Full warm-paper + maritime navy
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": ["@refrakt-md/lumina/presets/tideline"]
  }

  // Japanese-garden syntax highlighting (syntax-only, composes)
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": ["@refrakt-md/lumina/presets/niwaki"]
  }

See refrakt.md/docs/themes/lumina for live previews of both presets.
`);
	}
}

run();
