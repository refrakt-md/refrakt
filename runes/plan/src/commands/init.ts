import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runCreate } from './create.js';
import { idExists } from './next-id.js';
import { findInstallRoot, detectPackageManager, installCommand, type PackageManager } from './project-setup.js';
import { scaffoldRefraktConfigForPlan } from '../plan-config.js';

export const EXIT_SUCCESS = 0;
export const EXIT_ALREADY_EXISTS = 1;

export type AgentTarget = 'claude' | 'cursor' | 'copilot' | 'windsurf' | 'cline' | 'none';

/**
 * Tool-specific agent instruction files that get a brief plan summary
 * appended, pointing to plan/INSTRUCTIONS.md for the full reference.
 */
export const AGENT_FILES: Record<string, string> = {
	claude: 'CLAUDE.md',
	cursor: '.cursorrules',
	copilot: '.github/copilot-instructions.md',
	windsurf: '.windsurfrules',
	cline: '.clinerules',
	agents: 'AGENTS.md',
};

export interface InitOptions {
	dir: string;
	/** Path to the project root (for agent files + hooks + wrapper). Defaults to '.' */
	projectRoot?: string;
	/** Which AI tool instruction file(s) to update. Auto-detects when omitted. */
	agent?: AgentTarget;
	/** Skip modifying host package.json. */
	noPackageJson?: boolean;
	/** Skip writing .claude/settings.json SessionStart hook. */
	noHooks?: boolean;
	/** Skip writing .mcp.json (project-scoped MCP server registration). */
	noMcp?: boolean;
	/** Skip writing ./plan wrapper script. */
	noWrapper?: boolean;
	/** Skip creating/updating refrakt.config.json. */
	noConfig?: boolean;
	/** Override package versions pinned into devDependencies. Defaults to this plan package's own version. */
	versions?: { cli: string; plan: string };
}

export interface InitResult {
	dir: string;
	created: string[];
	agentFilesUpdated: string[];
	packageJsonUpdated: boolean;
	hookWritten: boolean;
	mcpWritten: boolean;
	wrapperWritten: boolean;
	installRoot: string | null;
	packageManager: PackageManager | null;
	/** What happened to refrakt.config.json — `null` when scaffolding was skipped (e.g., --no-config). */
	refraktConfig: { action: 'created' | 'extended' | 'preserved' | 'skipped'; path: string; message: string } | null;
}

/**
 * Brief plan summary appended to agent instruction files.
 * Points to plan/INSTRUCTIONS.md for the full reference.
 */
const PLAN_SUMMARY = `\n\n## Plan

Project planning lives in \`plan/\` as Markdoc files. Use \`refrakt plan\` commands to manage items — never edit plan files by hand. Run \`refrakt plan next\` to find work. See [plan/INSTRUCTIONS.md](plan/INSTRUCTIONS.md) for the full workflow reference.
`;

/** Markers used to detect that a file already contains our plan section. */
const PLAN_MARKERS = ['plan/INSTRUCTIONS.md', 'refrakt plan next', 'See [AGENTS.md]'];

/** Full tool-agnostic workflow guide written to plan/INSTRUCTIONS.md (kept for reference inside plan/). */
const INSTRUCTIONS_CONTENT = `# Plan — Workflow Guide

This directory contains project planning content using the \`@refrakt-md/plan\` runes package. All files are Markdoc (\`.md\` with \`{% %}\` tags).

## Directory Layout

\`\`\`
plan/
  specs/      — Specifications (what to build)
  work/       — Work items (how to build it)
  bugs/       — Bug reports (what is broken)
  decisions/  — Architecture decision records (why it's built this way)
  milestones/ — Named release targets with scope and goals
\`\`\`

## Workflow

If your MCP-aware editor or AI tool is registered with \`@refrakt-md/mcp\` (a project-scoped \`.mcp.json\` is included for clients that read it), prefer the MCP tools — \`plan.next\`, \`plan.update\`, \`plan.create\`, \`plan.status\`, etc. — over the CLI examples below. They accept structured inputs (status enum, priority enum) and return structured outputs without text parsing. The CLI examples remain canonical for environments without MCP.

1. Find next work item: \`refrakt plan next\`
2. Start working: \`refrakt plan update <id> --status in-progress\`
3. Read referenced specs and decisions before implementing
4. Check off criteria: \`refrakt plan update <id> --check "criterion text"\`
5. Mark complete with resolution: \`refrakt plan update <id> --status done --resolve "summary of what was done"\`
6. Check project status: \`refrakt plan status\`

When marking a work item done, always provide a \`--resolve\` summary unless the change is trivial. This captures implementation context (files changed, decisions made, branch/PR) for future reference.

## ID Conventions

| Type | Prefix | Example |
|------|--------|---------|
| Spec | \`SPEC-\` | \`SPEC-023\` |
| Work | \`WORK-\` | \`WORK-051\` |
| Decision | \`ADR-\` | \`ADR-005\` |
| Bug | \`BUG-\` | \`BUG-001\` |
| Milestone | \`v\`+semver | \`v1.0.0\` |

IDs are auto-assigned when you omit \`--id\` from \`refrakt plan create\`.

## Valid Statuses

- **spec**: \`draft\` → \`review\` → \`accepted\` → \`superseded\` | \`deprecated\`
- **work**: \`draft\` → \`ready\` → \`in-progress\` → \`review\` → \`done\` (also: \`blocked\`)
- **bug**: \`reported\` → \`confirmed\` → \`in-progress\` → \`fixed\` (also: \`wontfix\`, \`duplicate\`)
- **decision**: \`proposed\` → \`accepted\` → \`superseded\` | \`deprecated\`
- **milestone**: \`planning\` → \`active\` → \`complete\`

## Creating Items

\`\`\`bash
refrakt plan create work --title "Description"
refrakt plan create bug --title "Description"
refrakt plan create spec --title "Description"
refrakt plan create decision --title "Description"
refrakt plan create milestone --id v1.0 --title "Description"
\`\`\`

## When to Create Each Type

- **Spec**: A new feature idea, design proposal, or system description. Source of truth for *what* to build.
- **Work item**: A discrete, implementable piece of work with acceptance criteria.
- **Bug**: A defect report. Use instead of a work item when something is broken rather than missing.
- **Decision**: An architectural choice that needs to be recorded for future reference.

## Runes in Prose

Plan content is text-first, but a curated set of runes may be used inside entity bodies (specs, work items, bugs, decisions, milestones) when they genuinely clarify the prose.

- **\`sandbox\`** — embed a small runnable component or layout preview
- **\`diagram\`** — render a structured diagram (architecture, sequence, state)
- **\`chart\`** — render a chart from inline data
- **\`datatable\`** — render a structured data table with search/filter/sort
- **\`budget\`** — structured monetary budget block (costs, spend allocations)

Run \`refrakt reference <name>\` to get the exact Markdoc syntax for any rune (e.g. \`refrakt reference sandbox\`).

Prefer prose over runes by default — reach for a rune only when it is meaningfully clearer than plain text or a Markdown table.

## JSON Output

All commands support \`--format json\` for machine-readable output. This is useful for scripting, CI pipelines, and programmatic integration.
`;

/**
 * Shell command written into .claude/settings.json SessionStart hook.
 *
 * Detection order mirrors detectPackageManager in project-setup.ts:
 *   1. Corepack `packageManager` field in package.json (authoritative)
 *   2. The most recently modified lockfile (newest mtime wins — handles stale
 *      pnpm-lock.yaml / yarn.lock leftovers in an npm-workspaces repo)
 *   3. Default to npm
 */
const HOOK_COMMAND = `[ -x node_modules/.bin/refrakt ] || { pm=""; if [ -f package.json ]; then pm=$(sed -n 's/.*"packageManager"[[:space:]]*:[[:space:]]*"\\([a-z]*\\)@.*/\\1/p' package.json | head -n1); fi; case "$pm" in npm|pnpm|yarn|bun) ;; *) pm="" ;; esac; if [ -z "$pm" ]; then newest=""; for f in bun.lockb bun.lock pnpm-lock.yaml yarn.lock package-lock.json; do [ -f "$f" ] || continue; if [ -z "$newest" ] || [ "$f" -nt "$newest" ]; then newest=$f; fi; done; case "$newest" in bun.lock*) pm=bun ;; pnpm-lock.yaml) pm=pnpm ;; yarn.lock) pm=yarn ;; *) pm=npm ;; esac; fi; case "$pm" in bun) bun install ;; pnpm) pnpm install ;; yarn) yarn install ;; *) npm install ;; esac; }`;

/**
 * Wrapper script body. Works under any POSIX shell with `-nt` support
 * (dash, bash, ksh, zsh, busybox sh). Installs deps on first run using the
 * detected package manager, then defers to `npx refrakt plan`.
 */
const WRAPPER_SCRIPT = `#!/usr/bin/env sh
set -e

# Detection order:
#   1. Corepack packageManager field in package.json (authoritative)
#   2. Newest lockfile by mtime (so a stale pnpm-lock.yaml next to a fresh
#      package-lock.json correctly resolves to npm)
#   3. Default to npm
detect_pm() {
  pm=""
  if [ -f package.json ]; then
    pm=$(sed -n 's/.*"packageManager"[[:space:]]*:[[:space:]]*"\\([a-z]*\\)@.*/\\1/p' package.json | head -n1)
  fi
  case "$pm" in
    npm|pnpm|yarn|bun) echo "$pm"; return ;;
  esac
  newest=""
  for f in bun.lockb bun.lock pnpm-lock.yaml yarn.lock package-lock.json; do
    [ -f "$f" ] || continue
    if [ -z "$newest" ] || [ "$f" -nt "$newest" ]; then
      newest=$f
    fi
  done
  case "$newest" in
    bun.lock*) echo bun ;;
    pnpm-lock.yaml) echo pnpm ;;
    yarn.lock) echo yarn ;;
    *) echo npm ;;
  esac
}

if [ ! -x node_modules/.bin/refrakt ]; then
  case "$(detect_pm)" in
    bun) bun install ;;
    pnpm) pnpm install ;;
    yarn) yarn install ;;
    *) npm install ;;
  esac
fi
exec npx refrakt plan "$@"
`;

/**
 * Read this plan package's own version so we can pin host devDependencies
 * to a range compatible with the CLI that's running init.
 */
function getOwnVersion(): string {
	const here = dirname(fileURLToPath(import.meta.url));
	// Built: dist/commands/init.js → ../../package.json
	// Source (vitest via tsx): src/commands/init.ts → ../../package.json
	const candidates = [
		join(here, '..', '..', 'package.json'),
		join(here, '..', '..', '..', 'package.json'),
	];
	for (const p of candidates) {
		try {
			const pkg = JSON.parse(readFileSync(p, 'utf-8'));
			if (pkg && pkg.name === '@refrakt-md/plan' && typeof pkg.version === 'string') {
				return pkg.version;
			}
		} catch {
			// try next candidate
		}
	}
	return '*';
}

/** Detect which agent instruction files already exist in the project root. */
function detectAgentFiles(projectRoot: string): string[] {
	const found: string[] = [];
	for (const relPath of Object.values(AGENT_FILES)) {
		if (existsSync(join(projectRoot, relPath))) {
			found.push(relPath);
		}
	}
	return found;
}

function hasPlanMarker(content: string): boolean {
	return PLAN_MARKERS.some(m => content.includes(m));
}

/**
 * Append the brief plan summary to an agent instruction file.
 * Creates the file (and parent directories) if it doesn't exist.
 * Returns true if the file was updated.
 */
function appendPlanSummary(projectRoot: string, relPath: string): boolean {
	const filePath = join(projectRoot, relPath);
	if (existsSync(filePath)) {
		const content = readFileSync(filePath, 'utf-8');
		if (hasPlanMarker(content)) {
			return false;
		}
		appendFileSync(filePath, PLAN_SUMMARY);
		return true;
	}
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(filePath, PLAN_SUMMARY.trimStart());
	return true;
}

/**
 * Merge plan-related entries into an existing package.json or create one.
 * Never overwrites existing keys. Returns true if the file was modified.
 */
function updateHostPackageJson(pkgJsonPath: string, versions: { cli: string; plan: string }): boolean {
	let pkg: Record<string, any> = {};
	try {
		pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
	} catch {
		return false;
	}

	let changed = false;

	if (!pkg.scripts || typeof pkg.scripts !== 'object') {
		pkg.scripts = {};
	}
	if (!pkg.scripts.plan) {
		pkg.scripts.plan = 'refrakt plan';
		changed = true;
	}

	if (!pkg.devDependencies || typeof pkg.devDependencies !== 'object') {
		pkg.devDependencies = {};
	}
	const deps = pkg.devDependencies as Record<string, string>;
	const alreadyInDeps = (name: string) =>
		(pkg.dependencies && pkg.dependencies[name]) ||
		(pkg.devDependencies && pkg.devDependencies[name]);

	if (!alreadyInDeps('@refrakt-md/cli')) {
		deps['@refrakt-md/cli'] = `^${versions.cli}`;
		changed = true;
	}
	if (!alreadyInDeps('@refrakt-md/plan')) {
		deps['@refrakt-md/plan'] = `^${versions.plan}`;
		changed = true;
	}

	if (changed) {
		writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
	}
	return changed;
}

interface ClaudeSettingsHook {
	type: string;
	command: string;
}

interface ClaudeSettingsBlock {
	hooks?: ClaudeSettingsHook[];
}

interface ClaudeSettings {
	hooks?: {
		SessionStart?: ClaudeSettingsBlock[];
		[key: string]: ClaudeSettingsBlock[] | undefined;
	};
	[key: string]: any;
}

/**
 * Write (or merge into) .claude/settings.json with a SessionStart hook that
 * installs dependencies if `refrakt` isn't resolvable. If the file already
 * contains our hook command, leave it alone.
 */
function writeClaudeHook(projectRoot: string): boolean {
	const settingsDir = join(projectRoot, '.claude');
	const settingsPath = join(settingsDir, 'settings.json');

	let settings: ClaudeSettings = {};
	if (existsSync(settingsPath)) {
		try {
			settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
		} catch {
			return false;
		}
	}

	if (!settings.hooks) settings.hooks = {};
	if (!Array.isArray(settings.hooks.SessionStart)) settings.hooks.SessionStart = [];

	for (const block of settings.hooks.SessionStart) {
		if (!block.hooks) continue;
		if (block.hooks.some(h => h.command === HOOK_COMMAND)) {
			return false;
		}
	}

	settings.hooks.SessionStart.push({
		hooks: [{ type: 'command', command: HOOK_COMMAND }],
	});

	if (!existsSync(settingsDir)) {
		mkdirSync(settingsDir, { recursive: true });
	}
	writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
	return true;
}

/**
 * Write `.mcp.json` at the project root so MCP-aware clients (Claude Code,
 * Cursor, Claude Desktop via project scope) auto-register the
 * `@refrakt-md/mcp` server. Idempotent: when the file already exists with a
 * `refrakt` server entry, leave it alone. When it exists without one, add the
 * entry alongside the existing servers.
 */
function writeMcpConfig(projectRoot: string): boolean {
	const mcpPath = join(projectRoot, '.mcp.json');
	let config: { mcpServers?: Record<string, { command: string; args?: string[] }> } = {};
	if (existsSync(mcpPath)) {
		try {
			config = JSON.parse(readFileSync(mcpPath, 'utf-8'));
		} catch {
			return false;
		}
	}
	if (!config.mcpServers) config.mcpServers = {};
	if (config.mcpServers.refrakt) {
		// Already registered; nothing to do.
		return false;
	}
	config.mcpServers.refrakt = {
		command: 'npx',
		args: ['@refrakt-md/mcp'],
	};
	writeFileSync(mcpPath, JSON.stringify(config, null, '\t') + '\n');
	return true;
}

/**
 * Write a ./plan.sh wrapper script and mark it executable. We use `.sh`
 * because the default content directory is also called `plan/` and a file
 * named `plan` can't coexist with a directory of the same name in a single
 * parent. Users run `./plan.sh next` (or just `npm run plan -- next`).
 */
function writeWrapperScript(projectRoot: string): boolean {
	const scriptPath = join(projectRoot, 'plan.sh');
	if (existsSync(scriptPath)) {
		const existing = readFileSync(scriptPath, 'utf-8');
		if (existing === WRAPPER_SCRIPT) return false;
		// A different file already exists at ./plan.sh — don't clobber it.
		return false;
	}
	writeFileSync(scriptPath, WRAPPER_SCRIPT);
	try {
		chmodSync(scriptPath, 0o755);
	} catch {
		// Best-effort on platforms without POSIX perms (Windows).
	}
	return true;
}

/**
 * Initialize a plan directory structure, wire the host project for agent use,
 * and (optionally) install a Claude SessionStart hook + ./plan wrapper.
 */
export function runInit(options: InitOptions): InitResult {
	const {
		dir,
		projectRoot = '.',
		agent,
		noPackageJson = false,
		noHooks = false,
		noMcp = false,
		noWrapper = false,
		noConfig = false,
	} = options;

	const versions = options.versions ?? (() => {
		const v = getOwnVersion();
		return { cli: v, plan: v };
	})();

	const created: string[] = [];

	// --- 1. plan/ scaffolding ------------------------------------------------
	const dirs = ['work', 'bugs', 'specs', 'decisions', 'milestones'];
	for (const sub of dirs) {
		const path = join(dir, sub);
		if (!existsSync(path)) {
			mkdirSync(path, { recursive: true });
			created.push(path + '/');
		}
	}

	const examples: { type: 'spec' | 'work' | 'decision' | 'milestone'; id: string; title: string; attrs?: Record<string, string> }[] = [
		{ type: 'spec', id: 'SPEC-001', title: 'Example Spec' },
		{ type: 'work', id: 'WORK-001', title: 'Example Work Item', attrs: { priority: 'medium', complexity: 'simple', tags: '' } },
		{ type: 'decision', id: 'ADR-001', title: 'Example Decision' },
		{ type: 'milestone', id: 'v0.1.0', title: 'First Release' },
	];

	for (const ex of examples) {
		// Existing projects commonly already use the IDs we seed (SPEC-001, WORK-001,
		// ADR-001, v0.1.0). Skip the example silently instead of crashing — the
		// user has their own content, they don't need placeholders.
		if (idExists(dir, ex.id)) continue;
		const result = runCreate({ dir, type: ex.type, id: ex.id, title: ex.title, attrs: ex.attrs });
		created.push(result.file);
	}

	const instructionsFile = join(dir, 'INSTRUCTIONS.md');
	if (!existsSync(instructionsFile)) {
		writeFileSync(instructionsFile, INSTRUCTIONS_CONTENT);
		created.push(instructionsFile);
	}

	// --- 2. Append plan summary to agent instruction files ------------------
	const agentFilesUpdated: string[] = [];

	if (agent !== 'none') {
		const update = (relPath: string) => {
			if (appendPlanSummary(projectRoot, relPath)) {
				agentFilesUpdated.push(relPath);
			}
		};

		if (agent) {
			const relPath = AGENT_FILES[agent];
			if (relPath) update(relPath);
		} else {
			const existing = detectAgentFiles(projectRoot);
			for (const relPath of existing) update(relPath);
		}
	}

	// --- 3. Host package.json wiring ---------------------------------------
	const installRootInfo = findInstallRoot(projectRoot);
	const packageManager = installRootInfo ? detectPackageManager(installRootInfo.rootDir) : null;

	let packageJsonUpdated = false;
	if (!noPackageJson && installRootInfo) {
		packageJsonUpdated = updateHostPackageJson(installRootInfo.packageJsonPath, versions);
	}

	// --- 4. Claude SessionStart hook (gated) -------------------------------
	let hookWritten = false;
	const shouldWriteHook = (() => {
		if (noHooks) return false;
		if (agent === 'none') return false;
		if (agent === 'claude') return true;
		if (agent) return false; // explicit non-claude agent
		// auto-detect: write if CLAUDE.md exists or was just created
		return existsSync(join(projectRoot, AGENT_FILES.claude));
	})();
	if (shouldWriteHook) {
		hookWritten = writeClaudeHook(projectRoot);
	}

	// --- 4b. .mcp.json (gated like the hook — write when an MCP-aware client
	// is plausible) ---------------------------------------------------------
	let mcpWritten = false;
	const shouldWriteMcp = (() => {
		if (noMcp) return false;
		if (agent === 'none') return false;
		if (agent === 'claude') return true;
		if (agent === 'cursor') return true;
		if (agent) return false; // explicit non-MCP agent
		// auto-detect: write if CLAUDE.md exists or was just created
		return existsSync(join(projectRoot, AGENT_FILES.claude));
	})();
	if (shouldWriteMcp) {
		mcpWritten = writeMcpConfig(projectRoot);
	}

	// --- 5. ./plan.sh wrapper script ---------------------------------------
	let wrapperWritten = false;
	if (!noWrapper && agent !== 'none') {
		wrapperWritten = writeWrapperScript(projectRoot);
	}

	// --- 6. refrakt.config.json (gated) ------------------------------------
	let refraktConfig: InitResult['refraktConfig'] = null;
	if (!noConfig) {
		refraktConfig = scaffoldRefraktConfigForPlan({ projectRoot, planDir: dir });
	}

	return {
		dir,
		created,
		agentFilesUpdated,
		packageJsonUpdated,
		hookWritten,
		mcpWritten,
		wrapperWritten,
		installRoot: installRootInfo ? installRootInfo.rootDir : null,
		packageManager,
		refraktConfig,
	};
}

// Re-export for consumers that want to introspect the install command logic.
export { installCommand };
