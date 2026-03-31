#!/usr/bin/env node

const args = process.argv.slice(2);

const command = args[0];

if (!command || command === '--help' || command === '-h') {
	printUsage();
	process.exit(command ? 0 : 1);
}

if (command === 'write') {
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
} else if (command === 'extract') {
	// Deprecated: extract has moved to the docs rune package
	console.error('Warning: `refrakt extract` is deprecated. Use `refrakt docs extract` instead.\n');
	runPlugin('docs', ['extract', ...args.slice(1)]);
} else if (command === 'edit') {
	runEdit(args.slice(1));
} else if (command === 'timestamps') {
	runTimestamps(args.slice(1));
} else if (command === 'package') {
	runPackage(args.slice(1));
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
  timestamps           Generate timestamp cache from git history
  package <subcommand> Manage rune packages (validate)

Write Options:
  --output, -o <path>      Write output to a single file
  --output-dir, -d <dir>   Generate multiple files into a directory
  --provider, -p <name>    Provider: anthropic, gemini, ollama (default: auto-detect)
  --model, -m <name>       Model name (default: per-provider)
  --help, -h               Show this help message

Inspect Options:
  --list                   List all available runes
  --json                   Output as JSON
  --audit                  Check CSS coverage for generated selectors
  --all                    Audit all runes (use with --audit)
  --css <dir>              CSS directory for audit (auto-detected by default)
  --theme <name>           Theme to use (default: base)
  --items <n>              Number of repeated children (default: 3)
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
`);
}

function runTimestamps(timestampsArgs: string[]): void {
	let out = '.timestamps.json';

	for (let i = 0; i < timestampsArgs.length; i++) {
		const arg = timestampsArgs[i];
		if (arg === '--out' || arg === '-o') {
			out = timestampsArgs[++i];
			if (!out) {
				console.error('Error: --out requires a file path');
				process.exit(1);
			}
		} else if (arg === '--help' || arg === '-h') {
			console.log(`
Usage: refrakt timestamps [--out path]

Generate a .timestamps.json cache file from full git history.
Use this in CI before deploying to environments without full git history
(e.g. Cloudflare Pages). The cache is auto-detected by plan build and
can be referenced in refrakt.config.json via timestampsCache.

Options:
  --out, -o <path>   Output path (default: .timestamps.json)
`);
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`Error: Unknown flag "${arg}"`);
			process.exit(1);
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			process.exit(1);
		}
	}

	import('@refrakt-md/content').then(({ writeTimestampsCache }) => {
		const count = writeTimestampsCache(out);
		console.log(`Wrote ${count} entries to ${out}`);
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	});
}

// --- Plugin system ---

interface CliPluginCommand {
	name: string;
	description: string;
	handler: (args: string[]) => void | Promise<void>;
}

interface CliPlugin {
	namespace: string;
	commands: CliPluginCommand[];
}

async function runPlugin(namespace: string, pluginArgs: string[]): Promise<void> {
	const subcommand = pluginArgs[0];
	const packageName = `@refrakt-md/${namespace}`;
	const pluginEntry = `${packageName}/cli-plugin`;

	let plugin: CliPlugin;
	try {
		const mod = await import(pluginEntry);
		plugin = mod.default ?? mod;
	} catch {
		console.error(`\n  The "${namespace}" commands require ${packageName}.`);
		console.error(`  Install it: npm install ${packageName}\n`);
		process.exit(1);
	}

	if (!subcommand || subcommand === '--help' || subcommand === '-h') {
		console.log(`\nUsage: refrakt ${namespace} <command> [options]\n`);
		console.log('Commands:');
		const maxLen = Math.max(...plugin.commands.map(c => c.name.length));
		for (const cmd of plugin.commands) {
			console.log(`  ${cmd.name.padEnd(maxLen + 2)} ${cmd.description}`);
		}
		console.log();
		process.exit(0);
	}

	const cmd = plugin.commands.find(c => c.name === subcommand);
	if (!cmd) {
		console.error(`Error: Unknown ${namespace} command "${subcommand}"\n`);
		console.log('Available commands:');
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
 *  Falls back to baseConfig if no config file or packages are found. */
async function loadMergedConfig(
	runesModule: typeof import('@refrakt-md/runes'),
	assembleThemeConfig: typeof import('@refrakt-md/transform').assembleThemeConfig,
	configDir?: string,
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

	try {
		const { loadRefraktConfigFile } = await import('./config-file.js');
		const { config } = loadRefraktConfigFile(configDir);
		const coreRuneNames = new Set(Object.keys(runes));
		let merged;

		if (config.packages && config.packages.length > 0) {
			const loaded = await Promise.all(
				config.packages.map((name: string) => loadRunePackage(name))
			);
			merged = mergePackages(loaded, coreRuneNames, config.runes?.prefer);
			mergedRunes = { ...runes, ...merged.runes };
			mergedTags = { ...tags, ...merged.tags };
			packageFixtures = merged.fixtures;
		}

		if (config.runes?.local && Object.keys(config.runes.local).length > 0) {
			const local = await loadLocalRunes(config.runes.local, process.cwd());
			mergedRunes = { ...mergedRunes, ...local.runes };
			const localTags = runesModule.runeTagMap(local.runes);
			mergedTags = { ...mergedTags, ...localTags };
		}

		if (config.runes?.aliases && Object.keys(config.runes.aliases).length > 0) {
			const provenance = merged?.provenance ?? {};
			const aliased = applyAliases(mergedRunes, mergedTags, config.runes.aliases, provenance);
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
	} catch {
		// No config file or community packages — use core runes only
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
	let all = false;
	let cssDir: string | undefined;
	let theme = 'base';
	let items = 3;
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

		const merged = await loadMergedConfig(runesModule, assembleThemeConfig);

		return inspectCommand(
			{ runeName, list, json, audit, auditMeta, auditDimensions, all, cssDir, theme, items, flags },
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
			resolved = detectProvider(providerName);
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
		const { config } = await loadMergedConfig(runesModule, assembleThemeConfig, configDir);
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
