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
} else if (command.startsWith('-')) {
	console.error(`Error: Unknown flag "${command}"\n`);
	printUsage();
	process.exit(1);
} else {
	console.error(`Error: Unknown command "${command}"\n`);
	printUsage();
	process.exit(1);
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

Scaffold-CSS Options:
  --output-dir, -d <dir>   Output directory (default: ./styles/runes)
  --force                  Overwrite existing files

Validate Options:
  --config <path>          Path to theme config module (default: auto-detect)
  --manifest <path>        Path to manifest.json (default: auto-detect)

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
  refrakt contracts -o packages/lumina/contracts/structures.json
  refrakt contracts --check -o packages/lumina/contracts/structures.json
`);
}

function runInspect(inspectArgs: string[]): void {
	let runeName: string | undefined;
	let list = false;
	let json = false;
	let audit = false;
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
		import('@refrakt-md/theme-base'),
		import('@markdoc/markdoc'),
	]).then(([
		{ inspectCommand },
		{ runes, tags, nodes, serializeTree, extractHeadings },
		{ createTransform, renderToHtml, extractSelectors },
		{ baseConfig },
		markdocModule,
	]) => {
		const Markdoc = markdocModule.default ?? markdocModule;
		return inspectCommand(
			{ runeName, list, json, audit, all, cssDir, theme, items, flags },
			{ Markdoc, runes, tags, nodes, serializeTree, extractHeadings, createTransform, renderToHtml, extractSelectors, baseConfig },
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
	]).then(([{ detectProvider }, { writeCommand }]) => {
		let resolved;
		try {
			resolved = detectProvider(providerName);
		} catch (err) {
			console.error(`\nError: ${(err as Error).message}`);
			process.exit(1);
		}

		const modelName = model ?? resolved.defaultModel;
		return writeCommand({ prompt: prompt!, provider: resolved.provider, providerName: resolved.name, modelName, model, output, outputDir });
	}).catch((err) => {
		console.error(`\nError: ${(err as Error).message}`);
		process.exit(1);
	});
}

function runContracts(contractsArgs: string[]): void {
	let output: string | undefined;
	let check = false;

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

	import('./commands/contracts.js').then(({ contractsCommand }) => {
		contractsCommand({ output, check });
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
