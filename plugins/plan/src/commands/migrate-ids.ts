/**
 * `refrakt plan migrate ids` — renumber a colliding entity, when it can be
 * proved what every reference to that ID meant (SPEC-135 D8 / WORK-582).
 *
 * **The mechanical half is the easy half.** Rewriting `id=`, the filename and
 * every `{% ref %}` is bounded work. The hard part is knowing *which entity a
 * reference meant*: once two files both claim `BUG-019`, every
 * `{% ref "BUG-019" /%}` in the repository is ambiguous, and repointing one at
 * the wrong entity is silent, permanent, and lands in a file nobody is looking
 * at. That is the failure class SPEC-131 exists to remove, so this refuses
 * rather than guesses.
 *
 * The provable case is narrow and stated plainly: an entity can be renumbered
 * when **nothing outside it references the colliding ID**. Then there is no
 * reference whose meaning has to be inferred — only the entity's own
 * declaration, filename and self-references, all of which are unambiguous.
 *
 * Everything else is reported as a refusal naming the references that blocked
 * it. Prevention (`plan validate --against <ref>`) is what removes those cases,
 * by catching the collision while the branch still makes resolution free.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { scanPlanFiles } from '../scanner.js';

export const EXIT_SUCCESS = 0;
export const EXIT_ERRORS = 1;
export const EXIT_INVALID_ARGS = 2;

export interface MigrateIdsOptions {
	dir: string;
	apply?: boolean;
	useGit?: boolean;
}

export interface PlannedRenumber {
	/** The ID that was duplicated. */
	from: string;
	/** The free ID it moves to. */
	to: string;
	/** File being renumbered, plan-dir-relative. */
	file: string;
	/** New filename, plan-dir-relative. */
	toFile: string;
	/** The other file(s) keeping the original ID. */
	collidesWith: string[];
}

export interface RefusedRenumber {
	id: string;
	file: string;
	collidesWith: string[];
	reason: string;
	/** Files referencing the ambiguous ID, which a renumber would have to
	 *  repoint without being able to prove which entity each one meant. */
	ambiguousRefs: { file: string; line: number; text: string }[];
}

export interface MigrateIdsResult {
	mode: 'dry-run' | 'apply';
	scanned: number;
	planned: PlannedRenumber[];
	applied: PlannedRenumber[];
	refused: RefusedRenumber[];
	exitCode: number;
}

/** Every way a plan file can name another entity's ID.
 *
 *  Verified against the tree rather than assumed: `extractRefs`
 *  (`scanner-core.ts:175`) is private, returns a deduplicated `string[]` with no
 *  positions, and covers only `{% ref %}` / `{% xref %}` — not `source=` or
 *  `supersedes=`. So it cannot drive a rewrite, and this works on source text.
 *  Dependency sections (`## Blocked by` / `## Blocks`) need no separate pattern:
 *  their entries are `{% ref %}` tags, so the first pattern already covers them. */
function referencePatterns(id: string): RegExp[] {
	const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return [
		// {% ref "ID" /%} and {% xref "ID" /%}, single or double quoted.
		new RegExp(`(\\{%\\s*x?ref\\s+)(["'])${esc}\\2`, 'g'),
		// source="ID" / supersedes="ID" on an entity tag.
		new RegExp(`((?:source|supersedes)=)(["'])${esc}\\2`, 'g'),
	];
}

/** Does this line mention the ID in a way a renumber would have to rewrite? */
function lineReferences(line: string, id: string): boolean {
	return referencePatterns(id).some((re) => {
		re.lastIndex = 0;
		return re.test(line);
	});
}

/** Rewrite every reference to `from` as `to` in one file's source. */
function rewriteReferences(source: string, from: string, to: string): string {
	let out = source;
	for (const re of referencePatterns(from)) {
		// The pattern consumes the closing quote via the backreference, so the
		// replacement has to put it back. Dropping it silently produced
		// `id="WORK-002 status="` — malformed, and in every file touched.
		out = out.replace(re, (_m, prefix, quote) => `${prefix}${quote}${to}${quote}`);
	}
	return out;
}

/** Rewrite the entity's own `id="OLD"` declaration. */
function rewriteOwnId(source: string, from: string, to: string): string {
	const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return source.replace(new RegExp(`(\\bid=)(["'])${esc}\\2`), (_m, p, q) => `${p}${q}${to}${q}`);
}

/** The next unused numeric suffix for an ID's prefix, e.g. `WORK-` → WORK-583. */
function nextFreeId(prefix: string, taken: Set<string>): string {
	let n = 0;
	for (const id of taken) {
		if (!id.startsWith(`${prefix}-`)) continue;
		const num = Number.parseInt(id.slice(prefix.length + 1), 10);
		if (Number.isFinite(num) && num > n) n = num;
	}
	let candidate = `${prefix}-${String(n + 1).padStart(3, '0')}`;
	while (taken.has(candidate)) {
		n += 1;
		candidate = `${prefix}-${String(n + 1).padStart(3, '0')}`;
	}
	return candidate;
}

export function runMigrateIds(options: MigrateIdsOptions): MigrateIdsResult {
	const { dir, apply = false, useGit = false } = options;
	const root = resolve(dir);

	const entities = scanPlanFiles(dir, { cache: false });

	// Group by ID. Milestones are keyed by `name`, not `id`, and are not part of
	// the numbered-ID scheme, so they cannot collide this way.
	const byId = new Map<string, typeof entities>();
	const taken = new Set<string>();
	for (const e of entities) {
		const id = e.attributes.id;
		if (!id) continue;
		taken.add(id);
		const group = byId.get(id) ?? [];
		group.push(e);
		byId.set(id, group);
	}

	const planned: PlannedRenumber[] = [];
	const applied: PlannedRenumber[] = [];
	const refused: RefusedRenumber[] = [];

	for (const [id, group] of byId) {
		if (group.length < 2) continue;

		const prefix = id.includes('-') ? id.slice(0, id.lastIndexOf('-')) : id;

		// Which claimant "should" keep the ID is not knowable from the files
		// alone, so the choice is made deterministic (sorted by path) rather
		// than left to scan order. It is also harmless: this only ever acts when
		// *nothing* references the ID, so no reference is repointed either way
		// and the entities keep their content. The refusal check below is what
		// protects correctness — not which file happens to move.
		const sorted = [...group].sort((a, b) => a.file.localeCompare(b.file));
		const [keep, ...movers] = sorted;

		for (const mover of movers) {
			// Every mention of the ID outside the entity being renumbered is
			// ambiguous — it could have meant either claimant.
			const ambiguousRefs: { file: string; line: number; text: string }[] = [];
			for (const e of entities) {
				if (e.file === mover.file) continue;
				const abs = resolve(root, e.file);
				if (!existsSync(abs)) continue;
				const lines = readFileSync(abs, 'utf-8').split('\n');
				lines.forEach((line, i) => {
					if (lineReferences(line, id)) {
						ambiguousRefs.push({ file: e.file, line: i + 1, text: line.trim() });
					}
				});
			}

			if (ambiguousRefs.length > 0) {
				refused.push({
					id,
					file: mover.file,
					collidesWith: [keep!.file],
					reason:
						`${ambiguousRefs.length} reference(s) to ${id} exist outside the file being renumbered. ` +
						'Which entity each one meant cannot be established, and repointing one at the wrong ' +
						'entity is silent. Resolve by hand, or catch the collision pre-merge with ' +
						'`plan validate --against <ref>`, where the branch still makes it unambiguous.',
					ambiguousRefs,
				});
				continue;
			}

			const to = nextFreeId(prefix, taken);
			taken.add(to);

			const currentName = basename(mover.file);
			const relDir = dirname(mover.file);
			// Swap the ID prefix on the filename, keeping the slug.
			const slug = currentName.startsWith(`${id}-`)
				? currentName.slice(id.length + 1)
				: currentName;
			const toName = `${to}-${slug}`;
			const toFile = relDir === '.' ? toName : join(relDir, toName);

			const rename: PlannedRenumber = {
				from: id,
				to,
				file: mover.file,
				toFile,
				collidesWith: [keep!.file],
			};
			planned.push(rename);

			if (apply) {
				const absFrom = resolve(root, mover.file);
				const absTo = resolve(root, toFile);
				// Rename BEFORE rewriting. The rename is the operation that can
				// fail (git mv on an untracked file, a target that appeared
				// underneath us), and doing it first means a failure leaves the
				// file exactly as it was. Writing first left a file whose `id=`
				// had moved while its name had not — a duplicate that had
				// silently become invisible to the very check that found it.
				performRename(absFrom, absTo, useGit, root);
				let source = readFileSync(absTo, 'utf-8');
				source = rewriteOwnId(source, id, to);
				// Self-references inside the moved entity are unambiguous — they
				// are its own, by construction.
				source = rewriteReferences(source, id, to);
				writeFileSync(absTo, source, 'utf-8');
				applied.push(rename);
			}
		}
	}

	return {
		mode: apply ? 'apply' : 'dry-run',
		scanned: entities.length,
		planned,
		applied,
		refused,
		exitCode: refused.length > 0 ? EXIT_ERRORS : EXIT_SUCCESS,
	};
}

function performRename(absFrom: string, absTo: string, useGit: boolean, cwd: string): void {
	if (absFrom === absTo) return;
	if (useGit) {
		try {
			execFileSync('git', ['mv', absFrom, absTo], { cwd, stdio: 'pipe' });
			return;
		} catch {
			// Fall through to a plain rename — the file may be untracked, which
			// `git mv` refuses but which is perfectly fine to move.
		}
	}
	renameSync(absFrom, absTo);
	if (useGit) {
		try {
			execFileSync('git', ['add', absTo], { cwd, stdio: 'pipe' });
		} catch {
			// Staging is best-effort; the rename already happened.
		}
	}
}
