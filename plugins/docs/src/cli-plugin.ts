interface CliPluginCommand {
	name: string;
	description: string;
	handler: (args: string[]) => void | Promise<void>;
}

interface CliPlugin {
	namespace: string;
	commands: CliPluginCommand[];
}

async function handleExtract(args: string[]): Promise<void> {
	let input: string | undefined;
	let output: string | undefined;
	let lang: string | undefined;
	let validate = false;
	let sourceUrl: string | undefined;
	let title: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--output' || arg === '-o') {
			output = args[++i];
			if (!output) {
				console.error('Error: --output requires a path');
				process.exit(1);
			}
		} else if (arg === '--lang') {
			lang = args[++i];
			if (!lang) {
				console.error('Error: --lang requires a value');
				process.exit(1);
			}
			if (lang !== 'typescript' && lang !== 'python') {
				console.error(`Error: Unsupported language "${lang}". Supported: typescript, python`);
				process.exit(1);
			}
		} else if (arg === '--validate') {
			validate = true;
		} else if (arg === '--source-url') {
			sourceUrl = args[++i];
			if (!sourceUrl) {
				console.error('Error: --source-url requires a URL');
				process.exit(1);
			}
		} else if (arg === '--title') {
			title = args[++i];
			if (!title) {
				console.error('Error: --title requires a value');
				process.exit(1);
			}
		} else if (arg === '--help' || arg === '-h') {
			printExtractHelp();
			process.exit(0);
		} else if (arg.startsWith('-')) {
			console.error(`Error: Unknown flag "${arg}"\n`);
			printExtractHelp();
			process.exit(1);
		} else if (!input) {
			input = arg;
		} else {
			console.error(`Error: Unexpected argument "${arg}"\n`);
			printExtractHelp();
			process.exit(1);
		}
	}

	if (!input) {
		console.error('Error: Missing input path\n');
		printExtractHelp();
		process.exit(1);
	}

	if (!output && !validate) {
		console.error('Error: --output is required (or use --validate)\n');
		process.exit(1);
	}

	const { extractCommand } = await import('./extract/command.js');
	await extractCommand({
		input: input!,
		output: output ?? './content/api',
		lang: lang as 'typescript' | 'python' | undefined,
		validate,
		sourceUrl,
		title,
	});
}

function printExtractHelp(): void {
	console.log(`
Usage: refrakt docs extract <path> [options]

Extract symbols from source code into {% symbol %} Markdown files.

Options:
  --output, -o <path>      Output directory for generated files (required)
  --lang <language>         Language: typescript, python (default: auto-detect)
  --validate                Check if generated files are up to date (exit 1 if stale)
  --source-url <url>        Base URL for source code links
  --title <name>            Navigation section title (default: "API Reference")
  --help, -h                Show this help message

Examples:
  refrakt docs extract ./src -o ./content/api
  refrakt docs extract ./src -o ./content/api --source-url https://github.com/my/repo/blob/main/src
  refrakt docs extract ./src -o ./content/api --validate
`);
}

const plugin: CliPlugin = {
	namespace: 'docs',
	commands: [
		{
			name: 'extract',
			description: 'Extract symbols from source code into {% symbol %} Markdown',
			handler: handleExtract,
		},
	],
};

export default plugin;
