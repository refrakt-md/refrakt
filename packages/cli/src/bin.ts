#!/usr/bin/env node

const args = process.argv.slice(2);

const command = args[0];

if (!command || command === '--help' || command === '-h') {
	printUsage();
	// Append the installed-plugin section asynchronously, then exit.
	appendPluginsToHelp().finally(() => process.exit(command ? 0 : 1));
} else if (command === 'write') {
	runWrite(args.slice(1));
} else if (command === 'inspect') {
	runInspect(args.slice(1));
} else if (command === 'contracts') {
	runContracts(args.slice(1));
} else if (command === 'scaffold-css') {
	runScaffoldCss(args.slice(1));
} else if (command === 'validate') {
	runValidate(args.slice(1));
} else if (command === 'theme') {
	runTheme(args.slice(1));
} else if (command === 'plugins') {
	runPluginsCommand(args.slice(1));
} else if (command === 'config') {
	runConfigCommand(args.slice(1));
} else if (command === 'extract') {
	// Deprecated: extract has moved to the docs rune package
	console.error('Warning: `refrakt extract` is deprecated. Use `refrakt docs extract` instead.\n');
	runPlugin('docs', ['extract', ...args.slice(1)]);
} else if (command === 'edit') {
	runEdit(args.slice(1));
} else if (command === 'package') {
	runPackage(args.slice(1));
} else if (command === 'reference') {
	runReference(args.slice(1));
} else if (command.startsWith('-')) {
	console.error(`Error: Unknown flag "${command}"\n`);
	printUsage();
	process.exit(1);
} else {
	// Try plugin discovery for unknown commands
	runPlugin(command, args.slice(1));
}

function printUsage(): void {
	console.log(`
Usage: refrakt <command> [options]

Commands:
  write <prompt>       Generate a Markdown content file using AI
  inspect <rune>       Show identity transform output for a rune
  contracts [options]  Generate structure contracts from theme config
  scaffold-css         Generate CSS stub files for all runes
  validate             Validate theme config and manifest
  theme <subcommand>   Manage themes (install, info)
  edit                 Launch the browser-based content editor
  package <subcommand> Manage rune packages (validate)
  reference <subcommand>  Emit rune syntax reference for authors and AI agents
  plugins <subcommand> List installed plugins (list)
  config <subcommand>  Manage refrakt.config.json (migrate)

Write Options:
  --output, -o <path>      Write output to a single file
  --output-dir, -d <dir>   Generate multiple files into a directory
  --provider, -p <name>    Provider: anthropic, gemini, ollama (default: auto-detect)
  --model, -m <name>       Model name (default: per-provider)
  --help, -h               Show this help message

Inspect Options:
  --list                   List all available runes
  --json                   Output as JSON
  --interface              Show component override interface (props + slots)
  --audit                  Check CSS coverage for generated selectors
  --all                    Audit all runes (use with --audit)
  --css <dir>              CSS directory for audit (auto-detected by default)
  --theme <name>           Theme to use (default: base)
  --items <n>              Number of repeated children (default: 3)
  --site <name>            Site to use from refrakt.config.json (multi-site projects)
  --<attr>=<value>         Set a rune attribute (e.g., --type=warning)
  --<attr>=all             Expand all variants for that attribute

Provider auto-detection:
  1. ANTHROPIC_API_KEY env var → Anthropic
  2. GOOGLE_API_KEY env var → Gemini Flash
  3. OLLAMA_HOST env var → Ollama
  4. Default → Ollama at localhost:11434

Contracts Options:
  --output, -o <path>      Write contracts to a file (default: stdout)
  --check                  Validate existing file is up to date (exit 1 if stale)
  --config <dir>           Directory containing refrakt.config.json (default: cwd)
  --site <name>            Site to use from refrakt.config.json (multi-site projects)

Scaffold-CSS Options:
  --output-dir, -d <dir>   Output directory (default: ./styles/runes)
  --force                  Overwrite existing files

Validate Options:
  --config <path>          Path to theme config module (default: auto-detect)
  --manifest <path>        Path to manifest.json (default: auto-detect)

Theme Subcommands:
  theme install <source>   Install a theme (directory, .tgz, or npm package)
  theme info               Show current theme details

Examples:
  refrakt inspect hint --type=warning
  refrakt inspect hint --type=all
  refrakt inspect api --method=POST --path="/users"
  refrakt inspect --list
  refrakt inspect --list --json
  refrakt inspect hint --audit
  refrakt inspect hint --interface
  refrakt inspect --all --audit
  refrakt inspect hint --audit --css path/to/styles
  refrakt write -d content/ "Set up a docs site with index, guides, and blog"
  refrakt write -p ollama -m llama3.2 "Write a FAQ page"
  refrakt contracts -o packages/lumina/contracts/structures.json --config site
  refrakt contracts --check -o packages/lumina/contracts/structures.json --config site
  refrakt theme install ./my-theme
  refrakt theme install @my-org/my-theme
  refrakt theme info
  refrakt extract ./src -o ./content/api
  refrakt extract ./src -o ./content/api --source-url https://github.com/my/repo/blob/main/src
  refrakt extract ./src -o ./content/api --validate
  refrakt package validate
  refrakt package validate ./runes/marketing
  refrakt package validate --json
  refrakt edit
  refrakt edit --port 3000 --content-dir ./content
  refrakt edit --dev-server http://localhost:5173

Package Subcommands:
  package validate [dir]   Validate a rune package before publishing

Package Validate Options:
  --json                   Output as JSON
  <dir>                    Package directory (default: current directory)

Edit Options:
  --port, -p <number>      Editor port (default: 4800)
  --content-dir <dir>      Content directory (default: from refrakt.config.json)
  --dev-server <url>       URL of running dev server for live preview
  --no-open                Don't auto-open browser

Reference Subcommands:
  reference <name>             Print syntax reference for a single rune
  reference list               Enumerate available runes, grouped by package
  reference dump               Write a full reference to a file (default AGENTS.md)

Reference Options:
  --format <fmt>           Output format: markdown (default), json
  --config <dir>           Project root containing refrakt.config.json
  --no-example             Omit the example block (reference <name>)
  --package <name>         Filter by package (reference list)
  --output, -o <path>      Output file (reference dump; default: AGENTS.md)
  --section <heading>      Heading to replace in existing file (reference dump)
  --check                  Exit 1 if output file is out of date (reference dump)
`);
}

// --- Plugin system ---

import { discoverPlugins, type DiscoveredPlugin } from './lib/plugins.js';
import { closestMatch } from './lib/levenshtein.js';
import { runPluginsCommand, appendPluginsToHelp } from './commands/plugins.js';
import { runConfigCommand } from './commands/config.js';

/** Cached discovery for the lifetime of the CLI invocation. Implemented as a
 *  function declaration with a property cache so the symbol is fully hoisted —
 *  important because the dispatch code at the top of this file runs before
 *  any non-function-declaration bindings are initialized (TDZ). */
function getPlugins(): Promise<DiscoveredPlugin[]> {
	const self = getPlugins as { _cache?: Promise<DiscoveredPlugin[]> };
	if (!self._cache) {
		self._cache = discoverPlugins();
	}
	return self._cache;
}

async function runPlugin(namespace: string, pluginArgs: string[]): Promise<void> {
	const subcommand = pluginArgs[0];
	const plugins = await getPlugins();
	const plugin = plugins.find((p) => p.namespace === namespace);

	if (!plugin) {
		const namespaces = plugins.map((p) => p.namespace);
		const suggestion = closestMatch(namespace, namespaces);
		const packageName = `@refrakt-md/${namespace}`;

		console.error(`\n  Unknown command "${namespace}".`);
		if (suggestion) {
			console.error(`  Did you mean "${suggestion}"?\n`);
		} else if (namespaces.length === 0) {
			console.error(`\n  No refrakt plugins are installed in this project.`);
			console.error(`  Install one to enable namespaced commands, e.g.: npm install ${packageName}\n`);
		} else {
			console.error(`\n  Installed plugins: ${namespaces.map((n) => `"${n}"`).join(', ')}`);
			console.error(`  Or install a new one: npm install ${packageName}\n`);
		}
		process.exit(1);
	}

	if (!subcommand || subcommand === '--help' || subcommand === '-h') {
		console.log(`\nUsage: refrakt ${namespace} <command> [options]\n`);
		console.log('Commands:');
		const maxLen = Math.max(...plugin.commands.map((c) => c.name.length));
		for (const cmd of plugin.commands) {
			console.log(`  ${cmd.name.padEnd(maxLen + 2)} ${cmd.description}`);
		}
		console.log();
		process.exit(0);
	}

	const cmd = plugin.commands.find((c) => c.name === subcommand);
	if (!cmd) {
		const subNames = plugin.commands.map((c) => c.name);
		const subSuggestion = closestMatch(subcommand, subNames);

		console.error(`Error: Unknown ${namespace} command "${subcommand}"`);
		if (subSuggestion) {
			console.error(`  Did you mean "${subSuggestion}"?`);
		}
		console.log('\nAvailable commands:');
		for (const c of plugin.commands) {
			console.log(`  refrakt ${namespace} ${c.name}  — ${c.description}`);
		}
		console.log();
		process.exit(1);
	}

	try {
		await cmd.handler(pluginArgs.slice(1));
	} catch (err: any) {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	}
}

/** Load community packages from refrakt.config.json and assemble a merged ThemeConfig.
 *  Falls back to baseConfig if no config file or packages are found.
 *
 *  When `site` is provided, the named entry is read from `config.sites`; when
 *  omitted, single-site projects pick the lone site automatically and multi-site
 *  projects throw with the available site names. */
async function loadMergedConfig(
	runesModule: typeof import('@refrakt-md/runes'),
	assembleThemeConfig: typeof import('@refrakt-md/transform').assembleThemeConfig,
	configDir?: string,
	site?: string,
): Promise<{
	config: import('@refrakt-md/transform').ThemeConfig;
	runes: Record<string, any>;
	tags: Record<string, any>;
	fixtures: Record<string, string>;
}> {
	const { runes, tags, loadRunePackage, mergePackages, applyAliases, loadLocalRunes, baseConfig } = runesModule;

	let mergedRunes = runes;
	let mergedTags: Record<string, any> = tags;
	let mergedConfig = baseConfig;
	let packageFixtures: Record<string, string> = {};

	let configResult;
	try {
		const { loadRefraktConfigFile } = await import('./config-file.js');
		configResult = loadRefraktConfigFile(configDir);
	} catch {
		// No refrakt.config.json — fall back to core runes only.
		return { config: mergedConfig, runes: mergedRunes, tags: mergedTags, fixtures: packageFixtures };
	}

	try {
		const { config } = configResult;

		// Resolve which site's settings to use. For backwards compat with
		// flat-shape configs (and single-site nested), this falls back to the
		// top-level (mirrored) fields when no explicit site is declared.
		let siteScoped: {
			packages?: string[];
			runes?: import('@refrakt-md/types').SiteConfig['runes'];
		} = config;
		const hasSites = Object.keys(config.sites).length > 0;
		if (hasSites || site !== undefined) {
			const { resolveSite } = await import('@refrakt-md/transform/node');
			// resolveSite throws structured errors for unknown / ambiguous site
			// names and for the "no sites declared but --site requested" case.
			// Let them bubble up so the user sees them instead of a silent
			// fallback.
			const resolved = resolveSite(config, site);
			siteScoped = resolved.site;
		}

		const coreRuneNames = new Set(Object.keys(runes));
		let merged;

		if (siteScoped.packages && siteScoped.packages.length > 0) {
			const loaded = await Promise.all(
				siteScoped.packages.map((name: string) => loadRunePackage(name))
			);
			merged = mergePackages(loaded, coreRuneNames, siteScoped.runes?.prefer);
			mergedRunes = { ...runes, ...merged.runes };
			mergedTags = { ...tags, ...merged.tags };
			packageFixtures = merged.fixtures;
		}

		if (siteScoped.runes?.local && Object.keys(siteScoped.runes.local).length > 0) {
			const local = await loadLocalRunes(siteScoped.runes.local, process.cwd());
			mergedRunes = { ...mergedRunes, ...local.runes };
			const localTags = runesModule.runeTagMap(local.runes);
			mergedTags = { ...mergedTags, ...localTags };
		}

		if (siteScoped.runes?.aliases && Object.keys(siteScoped.runes.aliases).length > 0) {
			const provenance = merged?.provenance ?? {};
			const aliased = applyAliases(mergedRunes, mergedTags, siteScoped.runes.aliases, provenance);
			mergedTags = aliased.tags;
		}

		if (merged) {
			const assembled = assembleThemeConfig({
				coreConfig: baseConfig,
				packageRunes: merged.themeRunes,
				packageIcons: merged.themeIcons,
				packageBackgrounds: merged.themeBackgrounds,
				provenance: merged.provenance,
			});
			mergedConfig = assembled.config;
		}
	} catch (err) {
		// Site-resolution and package-load errors should surface to the user
		// rather than fall back silently — this is the "config exists but is
		// invalid" path. The "no config" case was handled above.
		throw err;
	}

	return { config: mergedConfig, runes: mergedRunes, tags: mergedTags, fixtures: packageFixtures };
}

function runInspect(inspectArgs: string[]): void {
	let runeName: string | undefined;
	let list = false;
	let json = false;
	let audit = false;
	let auditMeta = false;
	let auditDimensions = false;
	let showInterface = false;
	let all = false;
	let cssDir: string | undefined;
	let theme = 'base';
	let items = 3;
	let site: string | undefined;
	const flags: Record<string, string> = {};

	for (let i = 0; i < inspectArgs.length; i++) {
		const arg = inspectArgs[i];

		if (arg === '--list') {
			list = true;
		} else if (arg === '--json') {
			json = true;
		} else if (arg === '--audit') {
			audit = true;
		} else if (arg === '--audit-meta') {
			auditMeta = true;
		} else if (arg === '--audit-dimensions') {
			auditDimensions = true;
		} else if (arg === '--interface') {
			showInterface = true;
		} else if (arg === '--all') {
			all = true;
		} else if (arg === '--css') {
			cssDir = inspectArgs[++i];
			if (!cssDir) {
				console.error('Error: --css requires a directory path');
				process.exit(1);
			}
		} else if (arg === '--theme') {
			theme = inspectArgs[++i];
			if (!theme) {
				console.error('Error: --theme requires a value');
				process.exit(1);
			}
		} else if (arg === '--site') {
			site = inspectArgs[++i];
			if (!site) {
				console.error('Error: --site requires a name');
				process.exit(1);
			}
		} else if (arg === '--items') {
			const val = inspectArgs[++i];
			if (!val) {
				console.error('Error: --items requires a number');
				process.exit(1);
			}
			items = parseInt(val, 10);
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('--') && arg.includes('=')) {
			// --attr=value flags (rune-specific attributes)
			const eqIdx = arg.indexOf('=');
			const key = arg.slice(2, eqIdx);
			const value = arg.slice(eqIdx + 1);
			flags[key] = value;
		} else if (arg.startsWith('--')) {
			// --attr value flags (rune-specific attributes)
			const key = arg.slice(2);
			const value = inspectArgs[++i];
			if (!value) {
				console.error(`Error: --${key} requires a value`);
				process.exit(1);
			}
			flags[key] = value;
		} else if (!runeName) {
			runeName = arg;
		} else {
			console.error(`Error: Unexpected argument "${arg}"\n`);
			printUsage();
			process.exit(1);
		}
	}

	// Dynamic imports to avoid loading heavy dependencies at parse time
	Promise.all([
		import('./commands/inspect.js'),
		import('@refrakt-md/runes'),
		import('@refrakt-md/transform'),
		import('@markdoc/markdoc'),
	]).then(async ([
		{ inspectCommand },
		runesModule,
		{ createTransform, renderToHtml, extractSelectors, assembleThemeConfig },
		markdocModule,
	]) => {
		const { nodes, serializeTree, extractHeadings } = runesModule;
		const Markdoc = markdocModule.default ?? markdocModule;

		const merged = await loadMergedConfig(runesModule, assembleThemeConfig, undefined, site);

		return inspectCommand(
			{ runeName, list, json, audit, auditMeta, auditDimensions, showInterface, all, cssDir, theme, items, flags },
			{ Markdoc, runes: merged.runes, tags: merged.tags, nodes, serializeTree, extractHeadings, createTransform, renderToHtml, extractSelectors, baseConfig: merged.config, packageFixtures: merged.fixtures },
		);
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	});
}

function runWrite(writeArgs: string[]): void {
	let prompt: string | undefined;
	let output: string | undefined;
	let outputDir: string | undefined;
	let providerName: string | undefined;
	let model: string | undefined;

	for (let i = 0; i < writeArgs.length; i++) {
		const arg = writeArgs[i];

		if (arg === '--output' || arg === '-o') {
			output = writeArgs[++i];
			if (!output) {
				console.error('Error: --output requires a file path');
				process.exit(1);
			}
		} else if (arg === '--output-dir' || arg === '-d') {
			outputDir = writeArgs[++i];
			if (!outputDir) {
				console.error('Error: --output-dir requires a directory path');
				process.exit(1);
			}
		} else if (arg === '--provider' || arg === '-p') {
			providerName = writeArgs[++i];
			if (!providerName) {
				console.error('Error: --provider requires a value');
				process.exit(1);
			}
		} else if (arg === '--model' || arg === '-m') {
			model = writeArgs[++i];
			if (!model) {
				console.error('Error: --model requires a value');
				process.exit(1);
			}
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`Error: Unknown flag "${arg}"\n`);
			printUsage();
			process.exit(1);
		} else if (!prompt) {
			prompt = arg;
		} else {
			console.error(`Error: Unexpected argument "${arg}"\n`);
			printUsage();
			process.exit(1);
		}
	}

	if (!prompt) {
		console.error('Error: Missing prompt\n');
		printUsage();
		process.exit(1);
	}

	if (output && outputDir) {
		console.error('Error: --output and --output-dir are mutually exclusive\n');
		process.exit(1);
	}

	// Dynamic imports to avoid loading @refrakt-md/runes at parse time
	// (markdoc CJS/ESM interop requires Node.js 22.12+ or a bundler)
	Promise.all([
		import('./config.js'),
		import('./commands/write.js'),
		import('@refrakt-md/runes'),
	]).then(async ([{ detectProvider }, { writeCommand }, runesModule]) => {
		let resolved;
		try {
			resolved = await detectProvider(providerName);
		} catch (err) {
			console.error(`\nError: ${(err as Error).message}`);
			process.exit(1);
		}

		// Load community packages to include in AI prompt
		const { runes } = runesModule;
		let mergedRunes: Record<string, any> = runes;
		try {
			const { loadRefraktConfigFile } = await import('./config-file.js');
			const { config } = loadRefraktConfigFile();
			if (config.packages && config.packages.length > 0) {
				const loaded = await Promise.all(
					config.packages.map((name: string) => runesModule.loadRunePackage(name))
				);
				const merged = runesModule.mergePackages(loaded, new Set(Object.keys(runes)), config.runes?.prefer);
				mergedRunes = { ...runes, ...merged.runes };
			}
		} catch {
			// No config file or packages — use core runes only
		}

		const modelName = model ?? resolved.defaultModel;
		return writeCommand({ prompt: prompt!, provider: resolved.provider, providerName: resolved.name, modelName, model, output, outputDir, runes: mergedRunes });
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	});
}

function runContracts(contractsArgs: string[]): void {
	let output: string | undefined;
	let check = false;
	let configDir: string | undefined;
	let site: string | undefined;

	for (let i = 0; i < contractsArgs.length; i++) {
		const arg = contractsArgs[i];

		if (arg === '--output' || arg === '-o') {
			output = contractsArgs[++i];
			if (!output) {
				console.error('Error: --output requires a file path');
				process.exit(1);
			}
		} else if (arg === '--check') {
			check = true;
		} else if (arg === '--config') {
			configDir = contractsArgs[++i];
			if (!configDir) {
				console.error('Error: --config requires a directory path');
				process.exit(1);
			}
		} else if (arg === '--site') {
			site = contractsArgs[++i];
			if (!site) {
				console.error('Error: --site requires a name');
				process.exit(1);
			}
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`Error: Unknown flag "${arg}"\n`);
			printUsage();
			process.exit(1);
		} else {
			console.error(`Error: Unexpected argument "${arg}"\n`);
			printUsage();
			process.exit(1);
		}
	}

	Promise.all([
		import('./commands/contracts.js'),
		import('@refrakt-md/runes'),
		import('@refrakt-md/transform'),
	]).then(async ([
		{ contractsCommand },
		runesModule,
		{ assembleThemeConfig },
	]) => {
		const { config } = await loadMergedConfig(runesModule, assembleThemeConfig, configDir, site);
		contractsCommand({ output, check, config });
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	});
}

function runScaffoldCss(scaffoldArgs: string[]): void {
	let outputDir = './styles/runes';
	let force = false;

	for (let i = 0; i < scaffoldArgs.length; i++) {
		const arg = scaffoldArgs[i];

		if (arg === '--output-dir' || arg === '-d') {
			outputDir = scaffoldArgs[++i];
			if (!outputDir) {
				console.error('Error: --output-dir requires a directory path');
				process.exit(1);
			}
		} else if (arg === '--force') {
			force = true;
		} else if (arg === '--site') {
			// Accepted for forward compatibility; scaffold-css currently uses
			// baseConfig directly and is not yet site-scoped.
			scaffoldArgs[++i];
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`Error: Unknown flag "${arg}"\n`);
			printUsage();
			process.exit(1);
		} else {
			console.error(`Error: Unexpected argument "${arg}"\n`);
			printUsage();
			process.exit(1);
		}
	}

	import('./commands/scaffold-css.js').then(({ scaffoldCssCommand }) => {
		scaffoldCssCommand({ outputDir, force });
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	});
}

function runValidate(validateArgs: string[]): void {
	let configPath: string | undefined;
	let manifestPath: string | undefined;

	for (let i = 0; i < validateArgs.length; i++) {
		const arg = validateArgs[i];

		if (arg === '--config') {
			configPath = validateArgs[++i];
			if (!configPath) {
				console.error('Error: --config requires a file path');
				process.exit(1);
			}
		} else if (arg === '--manifest') {
			manifestPath = validateArgs[++i];
			if (!manifestPath) {
				console.error('Error: --manifest requires a file path');
				process.exit(1);
			}
		} else if (arg === '--site') {
			// Accepted for forward compatibility; theme/manifest validation
			// operates on explicit paths and is not yet site-scoped.
			validateArgs[++i];
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`Error: Unknown flag "${arg}"\n`);
			printUsage();
			process.exit(1);
		} else {
			console.error(`Error: Unexpected argument "${arg}"\n`);
			printUsage();
			process.exit(1);
		}
	}

	import('./commands/validate.js').then(({ validateCommand }) => {
		validateCommand({ configPath, manifestPath });
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	});
}

function runTheme(themeArgs: string[]): void {
	const subcommand = themeArgs[0];

	if (!subcommand || subcommand === '--help' || subcommand === '-h') {
		console.log(`
Usage: refrakt theme <subcommand> [options]

Subcommands:
  install <source>   Install a theme (directory, .tgz, or npm package name)
  info               Show current theme details

Examples:
  refrakt theme install ./my-theme
  refrakt theme install @my-org/my-theme
  refrakt theme info
`);
		process.exit(subcommand ? 0 : 1);
	}

	if (subcommand === 'install') {
		const source = themeArgs[1];
		if (!source) {
			console.error('Error: Missing source argument\n');
			console.error('Usage: refrakt theme install <directory | .tgz | package-name>');
			process.exit(1);
		}

		import('./commands/theme.js').then(({ themeInstallCommand }) => {
			return themeInstallCommand({ source });
		}).catch((err) => {
			console.error(`\nError: ${(err as Error).message}`);
			process.exit(1);
		});
	} else if (subcommand === 'info') {
		import('./commands/theme.js').then(({ themeInfoCommand }) => {
			return themeInfoCommand({});
		}).catch((err) => {
			console.error(`\nError: ${(err as Error).message}`);
			process.exit(1);
		});
	} else {
		console.error(`Error: Unknown theme subcommand "${subcommand}"\n`);
		console.error('Available subcommands: install, info');
		process.exit(1);
	}
}

function runPackage(packageArgs: string[]): void {
	const subcommand = packageArgs[0];

	if (!subcommand || subcommand === '--help' || subcommand === '-h') {
		console.log(`
Usage: refrakt package <subcommand> [options]

Subcommands:
  validate [dir]   Validate a rune package before publishing

Validate Options:
  --json           Output as JSON
  <dir>            Package directory (default: current directory)

Examples:
  refrakt package validate
  refrakt package validate ./runes/marketing
  refrakt package validate --json
`);
		process.exit(subcommand ? 0 : 1);
	}

	if (subcommand === 'validate') {
		let packageDir: string | undefined;
		let json = false;

		for (let i = 1; i < packageArgs.length; i++) {
			const arg = packageArgs[i];

			if (arg === '--json') {
				json = true;
			} else if (arg === '--site') {
				// Accepted for forward compatibility; package validate operates
				// on a single package directory and is not yet site-scoped.
				packageArgs[++i];
			} else if (arg === '--help' || arg === '-h') {
				printUsage();
				process.exit(0);
			} else if (arg.startsWith('-')) {
				console.error(`Error: Unknown flag "${arg}"\n`);
				printUsage();
				process.exit(1);
			} else if (!packageDir) {
				packageDir = arg;
			} else {
				console.error(`Error: Unexpected argument "${arg}"\n`);
				printUsage();
				process.exit(1);
			}
		}

		import('./commands/package-validate.js').then(({ packageValidateCommand }) => {
			return packageValidateCommand({ packageDir, json });
		}).catch((err) => {
			console.error(`\nError: ${(err as Error).message}`);
			process.exit(1);
		});
	} else {
		console.error(`Error: Unknown package subcommand "${subcommand}"\n`);
		console.error('Available subcommands: validate');
		process.exit(1);
	}
}

function runEdit(editArgs: string[]): void {
	let port: number | undefined;
	let contentDir: string | undefined;
	let devServer: string | undefined;
	let noOpen = false;

	for (let i = 0; i < editArgs.length; i++) {
		const arg = editArgs[i];

		if (arg === '--port' || arg === '-p') {
			const val = editArgs[++i];
			if (!val) {
				console.error('Error: --port requires a number');
				process.exit(1);
			}
			port = parseInt(val, 10);
		} else if (arg === '--content-dir') {
			contentDir = editArgs[++i];
			if (!contentDir) {
				console.error('Error: --content-dir requires a directory path');
				process.exit(1);
			}
		} else if (arg === '--dev-server') {
			devServer = editArgs[++i];
			if (!devServer) {
				console.error('Error: --dev-server requires a URL');
				process.exit(1);
			}
		} else if (arg === '--no-open') {
			noOpen = true;
		} else if (arg === '--help' || arg === '-h') {
			printUsage();
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`Error: Unknown flag "${arg}"\n`);
			printUsage();
			process.exit(1);
		} else {
			console.error(`Error: Unexpected argument "${arg}"\n`);
			printUsage();
			process.exit(1);
		}
	}

	import('./commands/edit.js').then(({ editCommand }) => {
		return editCommand({ port, contentDir, devServer, noOpen });
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	});
}

function runReference(refArgs: string[]): void {
	const subcommand = refArgs[0];

	if (!subcommand || subcommand === '--help' || subcommand === '-h') {
		console.log(`
Usage: refrakt reference <subcommand> [options]

Subcommands:
  <name>          Print syntax reference for a single rune
  list            Enumerate available runes, grouped by package
  dump            Write a full reference to a file (default AGENTS.md)

Name Options (refrakt reference <name>):
  --format <fmt>      Output format: markdown (default), json
  --no-example        Omit the example block
  --config <dir>      Project root containing refrakt.config.json

List Options (refrakt reference list):
  --package <name>    Filter runes by source package
  --format <fmt>      Output format: markdown (default), json
  --config <dir>      Project root containing refrakt.config.json

Dump Options (refrakt reference dump):
  --output, -o <path> Output file (default: AGENTS.md)
  --format <fmt>      Output format: markdown (default), json
  --section <heading> Heading to replace in existing markdown file
                      (default: "# Available Runes")
  --check             Exit 1 if output file is out of date
  --config <dir>      Project root containing refrakt.config.json

Examples:
  refrakt reference hero
  refrakt reference recipe --format json
  refrakt reference list
  refrakt reference list --package @refrakt-md/marketing
  refrakt reference dump
  refrakt reference dump --output AGENTS.md --check
`);
		process.exit(subcommand ? 0 : 1);
	}

	// `list` and `dump` are fixed subcommand keywords; anything else is treated
	// as a rune name.
	if (subcommand === 'list') {
		runReferenceList(refArgs.slice(1));
	} else if (subcommand === 'dump') {
		runReferenceDump(refArgs.slice(1));
	} else if (subcommand.startsWith('-')) {
		console.error(`Error: Unknown flag "${subcommand}"\n`);
		process.exit(2);
	} else {
		runReferenceName(subcommand, refArgs.slice(1));
	}
}

function parseReferenceArgs(remaining: string[], accept: Set<string>): {
	format: 'markdown' | 'json';
	configDir?: string;
	noExample: boolean;
	packageFilter?: string;
	output?: string;
	section?: string;
	check: boolean;
} {
	let format: 'markdown' | 'json' = 'markdown';
	let configDir: string | undefined;
	let noExample = false;
	let packageFilter: string | undefined;
	let output: string | undefined;
	let section: string | undefined;
	let check = false;

	const requireValue = (flag: string, value: string | undefined): string => {
		if (!value) {
			console.error(`Error: ${flag} requires a value`);
			process.exit(2);
		}
		return value;
	};

	for (let i = 0; i < remaining.length; i++) {
		const arg = remaining[i];
		if (arg === '--format') {
			const v = requireValue('--format', remaining[++i]);
			if (v !== 'markdown' && v !== 'json') {
				console.error(`Error: --format must be "markdown" or "json" (got "${v}")`);
				process.exit(2);
			}
			format = v;
		} else if (arg === '--config') {
			configDir = requireValue('--config', remaining[++i]);
		} else if (arg === '--no-example' && accept.has('--no-example')) {
			noExample = true;
		} else if (arg === '--package' && accept.has('--package')) {
			packageFilter = requireValue('--package', remaining[++i]);
		} else if ((arg === '--output' || arg === '-o') && accept.has('--output')) {
			output = requireValue('--output', remaining[++i]);
		} else if (arg === '--section' && accept.has('--section')) {
			section = requireValue('--section', remaining[++i]);
		} else if (arg === '--check' && accept.has('--check')) {
			check = true;
		} else if (arg === '--help' || arg === '-h') {
			runReference(['--help']);
			process.exit(0);
		} else {
			console.error(`Error: Unknown or unsupported flag "${arg}"`);
			process.exit(2);
		}
	}

	return { format, configDir, noExample, packageFilter, output, section, check };
}

function runReferenceName(name: string, remaining: string[]): void {
	const { format, configDir, noExample } = parseReferenceArgs(
		remaining,
		new Set(['--no-example']),
	);

	Promise.all([
		import('./commands/reference.js'),
		import('@refrakt-md/runes'),
		import('@refrakt-md/transform'),
	]).then(async ([{ referenceNameCommand }, runesModule, { assembleThemeConfig }]) => {
		const ctx = await buildReferenceContext(runesModule, assembleThemeConfig, configDir);
		const result = referenceNameCommand(ctx, { name, format, noExample });
		if (result.exitCode === 0) {
			console.log(result.output);
		} else {
			console.error(result.output);
		}
		process.exit(result.exitCode);
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(2);
	});
}

function runReferenceList(remaining: string[]): void {
	const { format, configDir, packageFilter } = parseReferenceArgs(
		remaining,
		new Set(['--package']),
	);

	Promise.all([
		import('./commands/reference.js'),
		import('@refrakt-md/runes'),
		import('@refrakt-md/transform'),
	]).then(async ([{ referenceListCommand }, runesModule, { assembleThemeConfig }]) => {
		const ctx = await buildReferenceContext(runesModule, assembleThemeConfig, configDir);
		const result = referenceListCommand(ctx, { packageFilter, format });
		if (result.exitCode === 0) {
			console.log(result.output);
		} else {
			console.error(result.output);
		}
		process.exit(result.exitCode);
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(2);
	});
}

function runReferenceDump(remaining: string[]): void {
	const { format, configDir, output, section, check } = parseReferenceArgs(
		remaining,
		new Set(['--output', '--section', '--check']),
	);

	Promise.all([
		import('./commands/reference.js'),
		import('@refrakt-md/runes'),
		import('@refrakt-md/transform'),
	]).then(async ([{ referenceDumpCommand }, runesModule, { assembleThemeConfig }]) => {
		const ctx = await buildReferenceContext(runesModule, assembleThemeConfig, configDir);
		const result = referenceDumpCommand(ctx, {
			output: output ?? 'AGENTS.md',
			format,
			section: section ?? '# Available Runes',
			check,
		});
		if (result.exitCode !== 0) {
			console.error(result.message);
			process.exit(result.exitCode);
		}
		if (result.wrote) {
			console.log(`Wrote reference to ${output ?? 'AGENTS.md'}`);
		}
		process.exit(0);
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(2);
	});
}

/** Build a ReferenceContext from the merged config, matching `loadMergedConfig` but
 *  also exposing the per-rune source-package identifier. */
async function buildReferenceContext(
	runesModule: typeof import('@refrakt-md/runes'),
	assembleThemeConfig: typeof import('@refrakt-md/transform').assembleThemeConfig,
	configDir?: string,
): Promise<import('@refrakt-md/runes').ReferenceContext> {
	const { runes: coreRunes, loadRunePackage, mergePackages, applyAliases, loadLocalRunes } = runesModule;

	const allRunes: Record<string, any> = { ...coreRunes };
	let fixtures: Record<string, string> = {};
	const source: Record<string, string> = {};

	for (const name of Object.keys(coreRunes)) {
		source[name] = 'core';
	}

	try {
		const { loadRefraktConfigFile } = await import('./config-file.js');
		const { config } = loadRefraktConfigFile(configDir);
		const coreRuneNames = new Set(Object.keys(coreRunes));

		if (config.packages && config.packages.length > 0) {
			const loadedPackages = await Promise.all(
				config.packages.map((name: string) => loadRunePackage(name))
			);
			const merged = mergePackages(loadedPackages, coreRuneNames, config.runes?.prefer);

			const runeToNpm: Record<string, string> = {};
			for (const loaded of loadedPackages) {
				for (const name of Object.keys(loaded.runes)) {
					runeToNpm[name] = loaded.npmName;
				}
			}

			for (const [name, rune] of Object.entries(merged.runes)) {
				allRunes[name] = rune;
				source[name] = runeToNpm[name] ?? 'package';
			}
			fixtures = { ...fixtures, ...merged.fixtures };

			// Assemble theme config so imports register their attribute presets.
			assembleThemeConfig({
				coreConfig: runesModule.baseConfig,
				packageRunes: merged.themeRunes,
				packageIcons: merged.themeIcons,
				packageBackgrounds: merged.themeBackgrounds,
				provenance: merged.provenance,
			});

			if (config.runes?.aliases && Object.keys(config.runes.aliases).length > 0) {
				const tags = runesModule.runeTagMap(allRunes);
				applyAliases(allRunes, tags, config.runes.aliases, merged.provenance);
			}
		}

		if (config.runes?.local && Object.keys(config.runes.local).length > 0) {
			const local = await loadLocalRunes(config.runes.local, process.cwd());
			for (const [name, rune] of Object.entries(local.runes)) {
				allRunes[name] = rune;
				source[name] = 'local';
			}
		}
	} catch {
		// No config or no packages — fall back to core-only
	}

	return { runes: allRunes, fixtures, source };
}
