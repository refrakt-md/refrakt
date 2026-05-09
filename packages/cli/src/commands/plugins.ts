import { discoverPlugins, type DiscoveredPlugin } from '../lib/plugins.js';

const SUBCOMMANDS = ['list', 'validate'] as const;

/** Entry point for `refrakt plugins ...`. */
export async function runPluginsCommand(args: string[]): Promise<void> {
	const sub = args[0];

	if (!sub || sub === '--help' || sub === '-h') {
		printPluginsUsage();
		process.exit(sub ? 0 : 1);
	}

	if (sub === 'list') {
		await runPluginsList(args.slice(1));
		return;
	}

	if (sub === 'validate') {
		await runPluginsValidate(args.slice(1));
		return;
	}

	console.error(`Error: Unknown plugins subcommand "${sub}"\n`);
	printPluginsUsage();
	process.exit(1);
}

/** `refrakt plugins validate [dir]` — pre-publish lint for a plugin. */
async function runPluginsValidate(args: string[]): Promise<void> {
	let pluginDir: string | undefined;
	let json = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--json') {
			json = true;
		} else if (arg === '--site') {
			args[++i];
		} else if (arg === '--help' || arg === '-h') {
			printPluginsUsage();
			process.exit(0);
		} else if (arg!.startsWith('-')) {
			console.error(`Error: Unknown flag "${arg}"\n`);
			printPluginsUsage();
			process.exit(1);
		} else if (!pluginDir) {
			pluginDir = arg;
		} else {
			console.error(`Error: Unexpected argument "${arg}"\n`);
			printPluginsUsage();
			process.exit(1);
		}
	}

	const { pluginValidateCommand } = await import('./plugin-validate.js');
	await pluginValidateCommand({ pluginDir, json });
}

/** `refrakt plugins list` — text or JSON output. */
async function runPluginsList(args: string[]): Promise<void> {
	const format = parseFormat(args);
	const plugins = await discoverPlugins();

	if (format === 'json') {
		console.log(JSON.stringify(plugins.map(toJson), null, 2));
		return;
	}

	if (plugins.length === 0) {
		console.log('No refrakt plugins are installed in this project.');
		console.log('Install one to get started, e.g.: npm install @refrakt-md/plan');
		return;
	}

	console.log('\nInstalled refrakt plugins:\n');
	const nsWidth = Math.max(...plugins.map((p) => p.namespace.length), 8);
	const pkgWidth = Math.max(...plugins.map((p) => `${p.pluginName}@${p.packageVersion}`.length), 12);
	for (const plugin of plugins) {
		const ns = plugin.namespace.padEnd(nsWidth);
		const pkg = `${plugin.pluginName}@${plugin.packageVersion}`.padEnd(pkgWidth);
		const count = `${plugin.commands.length} ${plugin.commands.length === 1 ? 'command' : 'commands'}`;
		console.log(`  ${ns}  ${pkg}  ${count}`);
		const cmdNames = plugin.commands.map((c) => c.name).join(', ');
		console.log(`              ${cmdNames}`);
		console.log();
	}
	console.log(`Run \`refrakt <namespace> --help\` for command details.`);
}

function parseFormat(args: string[]): 'text' | 'json' {
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === '--format') {
			const next = args[i + 1];
			if (next === 'json' || next === 'text') return next;
			console.error(`Error: --format must be "text" or "json"`);
			process.exit(1);
		}
		if (a === '--format=json') return 'json';
		if (a === '--format=text') return 'text';
		if (a === '--json') return 'json';
	}
	return 'text';
}

function toJson(plugin: DiscoveredPlugin): Record<string, unknown> {
	return {
		namespace: plugin.namespace,
		pluginName: plugin.pluginName,
		packageVersion: plugin.packageVersion,
		source: plugin.source,
		description: plugin.description,
		commands: plugin.commands.map((c) => ({
			name: c.name,
			description: c.description,
			hasInputSchema: c.inputSchema !== undefined,
			hasOutputSchema: c.outputSchema !== undefined,
			hasMcpHandler: c.mcpHandler !== undefined,
		})),
	};
}

function printPluginsUsage(): void {
	console.log(`
Usage: refrakt plugins <subcommand> [options]

Subcommands:
  list                 List installed plugins and their commands
  validate [dir]       Validate a plugin before publishing

Options:
  --format <fmt>       Output format: text (default) or json (list)
  --json               Shorthand for --format=json (list, validate)
  <dir>                Plugin directory (validate; default: current directory)

Examples:
  refrakt plugins list
  refrakt plugins list --format json
  refrakt plugins validate
  refrakt plugins validate ./plugins/marketing
  refrakt plugins validate --json
`);
	void SUBCOMMANDS;
}

/** Used by `refrakt --help`: append a short "Installed plugins:" section
 *  to the static usage output. Silently does nothing on discovery error. */
export async function appendPluginsToHelp(): Promise<void> {
	let plugins: DiscoveredPlugin[];
	try {
		plugins = await discoverPlugins({ warn: false });
	} catch {
		return;
	}
	if (plugins.length === 0) return;
	console.log(`Installed plugins:`);
	const width = Math.max(...plugins.map((p) => p.namespace.length));
	for (const plugin of plugins) {
		const desc = plugin.description ?? plugin.pluginName;
		console.log(`  ${plugin.namespace.padEnd(width + 2)} ${desc}`);
	}
	console.log();
}
