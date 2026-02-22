#!/usr/bin/env node

const args = process.argv.slice(2);

const command = args[0];

if (!command || command === '--help' || command === '-h') {
	printUsage();
	process.exit(command ? 0 : 1);
}

if (command === 'write') {
	runWrite(args.slice(1));
} else if (command === 'contracts') {
	runContracts(args.slice(1));
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
  write <prompt>      Generate a Markdown content file using AI
  contracts [options]  Generate structure contracts from theme config

Write Options:
  --output, -o <path>      Write output to a single file
  --output-dir, -d <dir>   Generate multiple files into a directory
  --provider, -p <name>    Provider: anthropic, gemini, ollama (default: auto-detect)
  --model, -m <name>       Model name (default: per-provider)
  --help, -h               Show this help message

Provider auto-detection:
  1. ANTHROPIC_API_KEY env var → Anthropic
  2. GOOGLE_API_KEY env var → Gemini Flash
  3. OLLAMA_HOST env var → Ollama
  4. Default → Ollama at localhost:11434

Contracts Options:
  --output, -o <path>      Write contracts to a file (default: stdout)
  --check                  Validate existing file is up to date (exit 1 if stale)

Examples:
  refrakt write "Create a getting started guide"
  refrakt write -o content/docs/api.md "Write an API reference page"
  refrakt write -d content/ "Set up a docs site with index, guides, and blog"
  refrakt write -p ollama -m llama3.2 "Write a FAQ page"
  refrakt contracts -o packages/lumina/contracts/structures.json
  refrakt contracts --check -o packages/lumina/contracts/structures.json
`);
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
