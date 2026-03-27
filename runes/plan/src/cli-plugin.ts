import { runUpdate, EXIT_NOT_FOUND, EXIT_VALIDATION_ERROR } from './commands/update.js';
import { runNext, EXIT_NO_MATCHES, EXIT_INVALID_ARGS } from './commands/next.js';
import { runCreate, EXIT_INVALID_ARGS as CREATE_INVALID_ARGS } from './commands/create.js';
import { runNextId, isAutoIdType, type AutoIdType } from './commands/next-id.js';
import { runInit } from './commands/init.js';
import { runStatus, EXIT_INVALID_ARGS as STATUS_INVALID_ARGS } from './commands/status.js';
import { runValidate, EXIT_INVALID_ARGS as VALIDATE_INVALID_ARGS } from './commands/validate.js';
import { runServe } from './commands/serve.js';
import { runBuild } from './commands/build.js';
import { VALID_TYPES, type PlanItemType } from './commands/templates.js';

interface CliPluginCommand {
	name: string;
	description: string;
	handler: (args: string[]) => void | Promise<void>;
}

interface CliPlugin {
	namespace: string;
	commands: CliPluginCommand[];
}

async function handleServe(args: string[]): Promise<void> {
	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let specsDir: string | undefined;
	let port = 3000;
	let theme = 'auto';
	let open = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--specs' && args[i + 1]) {
			specsDir = args[++i];
		} else if (arg === '--port' && args[i + 1]) {
			port = parseInt(args[++i], 10);
			if (isNaN(port)) {
				console.error('Error: --port must be a number');
				process.exit(1);
			}
		} else if (arg === '--theme' && args[i + 1]) {
			theme = args[++i];
		} else if (arg === '--open') {
			open = true;
		} else if (!arg.startsWith('-')) {
			dir = arg;
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			console.error('Usage: refrakt plan serve [directory] [--port N] [--specs dir] [--theme name] [--open]');
			process.exit(1);
		}
	}

	try {
		await runServe({ dir, specsDir, port, theme, open });
	} catch (err: any) {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	}
}

async function handleBuild(args: string[]): Promise<void> {
	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let specsDir: string | undefined;
	let out = './plan-site';
	let theme = 'auto';
	let baseUrl = '/';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--specs' && args[i + 1]) {
			specsDir = args[++i];
		} else if (arg === '--out' && args[i + 1]) {
			out = args[++i];
		} else if (arg === '--theme' && args[i + 1]) {
			theme = args[++i];
		} else if (arg === '--base-url' && args[i + 1]) {
			baseUrl = args[++i];
			if (!baseUrl.endsWith('/')) baseUrl += '/';
		} else if (!arg.startsWith('-')) {
			dir = arg;
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			console.error('Usage: refrakt plan build [directory] [--out dir] [--specs dir] [--theme name] [--base-url url]');
			process.exit(1);
		}
	}

	try {
		const result = await runBuild({ dir, specsDir, out, theme, baseUrl });
		console.log(`Built ${result.pages} pages to ${result.outputDir}/`);
		for (const f of result.files) {
			console.log(`  + ${f}`);
		}
	} catch (err: any) {
		console.error(`Error: ${err.message}`);
		process.exit(1);
	}
}

function handleUpdate(args: string[]): void {
	const id = args[0];
	if (!id || id.startsWith('-')) {
		console.error('Usage: refrakt plan update <id> [--status <s>] [--check "text"] [--uncheck "text"] [--resolve "text"] [--resolve-file <path>] [--<attr> <value>] [--format json]');
		process.exit(1);
	}

	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let formatJson = false;
	let check: string | undefined;
	let uncheck: string | undefined;
	let resolveText: string | undefined;
	let resolveFile: string | undefined;
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
		} else if (arg === '--resolve' && args[i + 1]) {
			resolveText = args[++i];
		} else if (arg === '--resolve-file' && args[i + 1]) {
			resolveFile = args[++i];
		} else if (arg.startsWith('--') && args[i + 1]) {
			const key = arg.slice(2);
			attrs[key] = args[++i];
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			process.exit(1);
		}
	}

	if (Object.keys(attrs).length === 0 && !check && !uncheck && !resolveText && !resolveFile) {
		console.error('Error: No changes specified. Use --status, --check, --uncheck, --resolve, or --<attr> <value>.');
		process.exit(1);
	}

	try {
		const result = runUpdate({ id, dir, attrs, check, uncheck, resolve: resolveText, resolveFile, formatJson });
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

function handleCreate(args: string[]): void {
	const type = args[0] as PlanItemType;
	if (!type || !VALID_TYPES.includes(type)) {
		console.error(`Usage: refrakt plan create <type> [--id <id>] --title "..."`);
		console.error(`Types: ${VALID_TYPES.join(', ')}`);
		console.error(`When --id is omitted, the next available ID is assigned automatically.`);
		process.exit(CREATE_INVALID_ARGS);
	}

	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let id: string | undefined;
	let title = '';
	let formatJson = false;
	const attrs: Record<string, string> = {};

	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--id' && args[i + 1]) {
			id = args[++i];
		} else if (arg === '--title' && args[i + 1]) {
			title = args[++i];
		} else if (arg === '--format' && args[i + 1] === 'json') {
			formatJson = true;
			i++;
		} else if (arg.startsWith('--') && args[i + 1]) {
			const key = arg.slice(2);
			attrs[key] = args[++i];
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			process.exit(CREATE_INVALID_ARGS);
		}
	}

	try {
		const result = runCreate({ dir, type, id, title, attrs: Object.keys(attrs).length > 0 ? attrs : undefined });
		if (formatJson) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			console.log(`Created ${result.type} ${result.id} at ${result.file}`);
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

function handleNextId(args: string[]): void {
	const type = args[0];
	const autoIdTypes = ['spec', 'work', 'bug', 'decision'];
	if (!type || !isAutoIdType(type)) {
		console.error(`Usage: refrakt plan next-id <type> [--format json]`);
		console.error(`Types: ${autoIdTypes.join(', ')}`);
		process.exit(EXIT_INVALID_ARGS);
	}

	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let formatJson = false;

	for (let i = 1; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--format' && args[i + 1] === 'json') {
			formatJson = true;
			i++;
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			process.exit(EXIT_INVALID_ARGS);
		}
	}

	const result = runNextId(dir, type as AutoIdType);

	if (formatJson) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		if (result.highest) {
			console.log(`${result.nextId}  (highest existing: ${result.highest})`);
		} else {
			console.log(`${result.nextId}  (no existing ${type} IDs found)`);
		}
	}
}

function handleInit(args: string[]): void {
	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let projectRoot = '.';
	let formatJson = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--project-root' && args[i + 1]) {
			projectRoot = args[++i];
		} else if (arg === '--format' && args[i + 1] === 'json') {
			formatJson = true;
			i++;
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			console.error('Usage: refrakt plan init [--dir <path>] [--project-root <path>] [--format json]');
			process.exit(1);
		}
	}

	const result = runInit({ dir, projectRoot });

	if (formatJson) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		if (result.created.length === 0) {
			console.log('Plan structure already exists. No changes made.');
		} else {
			console.log(`Initialized plan in ${result.dir}/`);
			for (const f of result.created) {
				console.log(`  + ${f}`);
			}
			if (result.claudeMdUpdated) {
				console.log('  + Updated CLAUDE.md with workflow section');
			}
		}
	}
}

function handleValidate(args: string[]): void {
	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let formatJson = false;
	let strict = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--format' && args[i + 1] === 'json') {
			formatJson = true;
			i++;
		} else if (arg === '--strict') {
			strict = true;
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			console.error('Usage: refrakt plan validate [--strict] [--format json]');
			process.exit(VALIDATE_INVALID_ARGS);
		}
	}

	const result = runValidate({ dir, strict, formatJson });

	if (formatJson) {
		console.log(JSON.stringify(result, null, 2));
		process.exit(result.exitCode);
		return;
	}

	console.log(`  Scanned: ${result.scanned} files`);
	console.log();

	for (const issue of result.issues) {
		const prefix = issue.severity === 'error' ? '  ✗ error  ' :
			issue.severity === 'warning' ? '  ⚠ warn   ' : '  ℹ info   ';
		console.log(`${prefix} ${issue.message}`);
	}

	if (result.issues.length > 0) {
		console.log();
	}

	console.log(`  Result: ${result.counts.errors} errors, ${result.counts.warnings} warnings, ${result.counts.info} info`);
	process.exit(result.exitCode);
}

function handleStatus(args: string[]): void {
	let dir = process.env.REFRAKT_PLAN_DIR || 'plan';
	let formatJson = false;
	let milestone: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--dir' && args[i + 1]) {
			dir = args[++i];
		} else if (arg === '--format' && args[i + 1] === 'json') {
			formatJson = true;
			i++;
		} else if (arg === '--milestone' && args[i + 1]) {
			milestone = args[++i];
		} else {
			console.error(`Error: Unexpected argument "${arg}"`);
			console.error('Usage: refrakt plan status [--milestone <name>] [--format json]');
			process.exit(STATUS_INVALID_ARGS);
		}
	}

	const result = runStatus({ dir, milestone, formatJson });

	if (formatJson) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	// Text output
	if (result.milestone) {
		const m = result.milestone;
		const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
		const filled = Math.round(pct / 10);
		const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
		const targetStr = m.target ? `, target: ${m.target}` : '';
		console.log(`${m.name} (${m.status}${targetStr})`);
		console.log(`  ${bar}  ${m.done}/${m.total} items (${pct}%)`);
		console.log();
	}

	// Counts
	for (const [label, data] of Object.entries(result.counts)) {
		if (data.total === 0) continue;
		const statuses = Object.entries(data.byStatus)
			.map(([s, n]) => `${n} ${s}`)
			.join('  ');
		console.log(`  ${label.padEnd(12)} ${String(data.total).padStart(3)} total    ${statuses}`);
	}
	console.log();

	// Blocked
	if (result.blocked.length > 0) {
		console.log('  Blocked:');
		for (const b of result.blocked) {
			const blockers = b.blockedBy.length > 0 ? ` → blocked by ${b.blockedBy.join(', ')}` : '';
			console.log(`    ${b.id}  ${b.title ?? '(untitled)'}${blockers}`);
		}
		console.log();
	}

	// Ready
	if (result.ready.length > 0) {
		console.log('  Ready (highest priority):');
		for (const r of result.ready) {
			console.log(`    ${r.id}  ${(r.title ?? '(untitled)').padEnd(35)}  ${r.priority.padEnd(9)} ${r.complexity}`);
		}
		console.log();
	}

	// Done (recent)
	if (result.done.length > 0) {
		console.log('  Done (recent):');
		for (const d of result.done) {
			const dateStr = d.date ? `  ${d.date}` : '';
			const prStr = d.pr ? `  → ${d.pr}` : '';
			console.log(`    ${d.id}  ${(d.title ?? '(untitled)').padEnd(35)}${dateStr}${prStr}`);
		}
		console.log();
	}

	// Warnings
	if (result.warnings.length > 0) {
		console.log('  Warnings:');
		for (const w of result.warnings) {
			console.log(`    ${w.message}`);
		}
		console.log();
	}
}

const plugin: CliPlugin = {
	namespace: 'plan',
	commands: [
		{ name: 'status', description: 'Terminal status summary', handler: handleStatus },
		{ name: 'next', description: 'Find next work item', handler: handleNext },
		{ name: 'update', description: 'Update plan item attributes', handler: handleUpdate },
		{ name: 'validate', description: 'Validate plan structure', handler: handleValidate },
		{ name: 'create', description: 'Scaffold new plan items', handler: handleCreate },
		{ name: 'next-id', description: 'Show next available ID for a type', handler: handleNextId },
		{ name: 'init', description: 'Scaffold plan structure', handler: handleInit },
		{ name: 'serve', description: 'Browse the plan dashboard', handler: handleServe },
		{ name: 'build', description: 'Build static plan site', handler: handleBuild },
	],
};

export default plugin;
