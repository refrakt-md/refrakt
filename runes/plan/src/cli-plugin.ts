import { runUpdate, EXIT_NOT_FOUND, EXIT_VALIDATION_ERROR } from './commands/update.js';
import { runNext, EXIT_NO_MATCHES, EXIT_INVALID_ARGS } from './commands/next.js';

interface CliPluginCommand {
	name: string;
	description: string;
	handler: (args: string[]) => void | Promise<void>;
}

interface CliPlugin {
	namespace: string;
	commands: CliPluginCommand[];
}

function notYetImplemented(name: string) {
	return () => {
		console.error(`Error: "plan ${name}" is not yet implemented.`);
		process.exit(1);
	};
}

function handleUpdate(args: string[]): void {
	const id = args[0];
	if (!id || id.startsWith('-')) {
		console.error('Usage: refrakt plan update <id> [--status <s>] [--check "text"] [--uncheck "text"] [--<attr> <value>] [--format json]');
		process.exit(1);
	}

	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let formatJson = false;
	let check: string | undefined;
	let uncheck: string | undefined;
	const attrs: Record<string, string> = {};

	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--format' && args[i + 1] === 'json') {
			formatJson = true;
			i++;
		} else if (arg === '--check' && args[i + 1]) {
			check = args[++i];
		} else if (arg === '--uncheck' && args[i + 1]) {
			uncheck = args[++i];
		} else if (arg.startsWith('--') && args[i + 1]) {
			const key = arg.slice(2);
			attrs[key] = args[++i];
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			process.exit(1);
		}
	}

	if (Object.keys(attrs).length === 0 && !check && !uncheck) {
		console.error('Error: No changes specified. Use --status, --check, --uncheck, or --<attr> <value>.');
		process.exit(1);
	}

	try {
		const result = runUpdate({ id, dir, attrs, check, uncheck, formatJson });
		if (formatJson) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			if (result.changes.length === 0) {
				console.log(`No changes needed for ${id}.`);
			} else {
				console.log(`Updated ${id} in ${result.file}:`);
				for (const c of result.changes) {
					if (c.old === '') {
						console.log(`  + ${c.field}: ${c.new}`);
					} else {
						console.log(`  ${c.field}: ${c.old} → ${c.new}`);
					}
				}
			}
		}
	} catch (err: any) {
		const exitCode = err.exitCode ?? 1;
		if (formatJson) {
			console.error(JSON.stringify({ error: err.message }, null, 2));
		} else {
			console.error(`Error: ${err.message}`);
		}
		process.exit(exitCode);
	}
}

function handleNext(args: string[]): void {
	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let formatJson = false;
	let milestone: string | undefined;
	let tag: string | undefined;
	let assignee: string | undefined;
	let type: 'work' | 'bug' | 'all' = 'all';
	let count = 1;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--format' && args[i + 1] === 'json') {
			formatJson = true;
			i++;
		} else if (arg === '--milestone' && args[i + 1]) {
			milestone = args[++i];
		} else if (arg === '--tag' && args[i + 1]) {
			tag = args[++i];
		} else if (arg === '--assignee' && args[i + 1]) {
			assignee = args[++i];
		} else if (arg === '--type' && args[i + 1]) {
			const val = args[++i];
			if (val !== 'work' && val !== 'bug' && val !== 'all') {
				console.error(`Error: Invalid type "${val}". Use: work, bug, all`);
				process.exit(EXIT_INVALID_ARGS);
			}
			type = val;
		} else if (arg === '--count' && args[i + 1]) {
			count = parseInt(args[++i], 10);
			if (isNaN(count) || count < 1) {
				console.error('Error: --count must be a positive integer');
				process.exit(EXIT_INVALID_ARGS);
			}
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			console.error('Usage: refrakt plan next [--milestone <name>] [--tag <tag>] [--assignee <name>] [--type work|bug|all] [--count N] [--format json]');
			process.exit(EXIT_INVALID_ARGS);
		}
	}

	const result = runNext({ dir, milestone, tag, assignee, type, count, formatJson });

	if (result.items.length === 0) {
		if (formatJson) {
			console.log(JSON.stringify({ items: [] }, null, 2));
		} else {
			console.log('No actionable items found.');
		}
		process.exit(EXIT_NO_MATCHES);
	}

	if (formatJson) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		for (const item of result.items) {
			console.log(`${item.id}  ${item.title ?? '(untitled)'}`);
			console.log(`  type: ${item.type}  priority: ${item.priority}  complexity: ${item.complexity}`);
			console.log(`  file: ${item.file}`);
			if (item.criteria.length > 0) {
				console.log('  criteria:');
				for (const c of item.criteria) {
					console.log(`    ${c.checked ? '[x]' : '[ ]'} ${c.text}`);
				}
			}
			if (item.refs.length > 0) {
				console.log(`  refs: ${item.refs.join(', ')}`);
			}
			console.log();
		}
	}
}

const plugin: CliPlugin = {
	namespace: 'plan',
	commands: [
		{ name: 'status', description: 'Terminal status summary', handler: notYetImplemented('status') },
		{ name: 'next', description: 'Find next work item', handler: handleNext },
		{ name: 'update', description: 'Update plan item attributes', handler: handleUpdate },
		{ name: 'validate', description: 'Validate plan structure', handler: notYetImplemented('validate') },
		{ name: 'create', description: 'Scaffold new plan items', handler: notYetImplemented('create') },
		{ name: 'init', description: 'Scaffold plan structure', handler: notYetImplemented('init') },
		{ name: 'serve', description: 'Browse the plan dashboard', handler: notYetImplemented('serve') },
		{ name: 'build', description: 'Build static plan site', handler: notYetImplemented('build') },
	],
};

export default plugin;
