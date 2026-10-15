/**
 * `plan validate --against <ref>` — catch an ID collision *before* the merge
 * that creates it (SPEC-135 D8 / WORK-582).
 *
 * Plain duplicate detection already ships and is correct, but it can only fire
 * once both claimants are reachable — which is after the merge, when every
 * `{% ref %}` to that ID has already become ambiguous. This fires one step
 * earlier, on the branch, where resolution is still free: every reference to the
 * branch's own new entity is unambiguously the branch's, because the base ref
 * does not contain it.
 *
 * That is the whole reason this tier is the valuable one. It is also why it
 * wants somewhere to run — WORK-580's PR job.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface AgainstCollision {
	id: string;
	/** Path in the working tree claiming the ID, plan-dir-relative. */
	file: string;
	/** Path on the base ref claiming the same ID. */
	refFile: string;
}

export interface RefIdIndex {
	ref: string;
	/** id → repo-relative path, as the base ref has it. Empty when `error` is set. */
	refIds: Map<string, string>;
	/** Set when the ref could not be read — the caller must treat this as a
	 *  failure rather than "no collisions found". */
	error?: string;
}

/** Read `id="…"` out of a plan file's source. */
function readId(source: string): string | undefined {
	const m = source.match(/\bid=(["'])([^"']+)\1/);
	return m?.[2];
}

function git(args: string[], cwd: string): string {
	return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Compare the IDs claimed in the working tree against those on `ref`.
 *
 * A collision is an ID claimed by **different files** on the two sides: the
 * branch added `WORK-583` in one file while the base already spends it on
 * another, so the merge produces two claimants. The same ID in the same file is
 * simply the file existing on both sides, which is the normal case.
 *
 * @param planDir Plan directory, relative to the repo root.
 * @param ref     Any git ref — `origin/main`, a tag, a SHA.
 * @param cwd     Repo root.
 */
export function readRefIds(planDir: string, ref: string, cwd: string): RefIdIndex {
	// Resolve the ref first, so a typo or an unfetched branch fails loudly
	// instead of reporting a clean run. "No collisions" and "I could not look"
	// must never render the same way — that is the failure this milestone is
	// about.
	try {
		git(['rev-parse', '--verify', `${ref}^{commit}`], cwd);
	} catch {
		return {
			ref,
			refIds: new Map(),
			error:
				`Cannot resolve git ref "${ref}". Nothing was compared.\n` +
				`  If this is a remote branch, fetch it first: git fetch origin ${ref.replace(/^origin\//, '')}`,
		};
	}

	let listing: string;
	try {
		listing = git(['ls-tree', '-r', '--name-only', ref, '--', planDir], cwd);
	} catch (err) {
		return {
			ref,
			refIds: new Map(),
			error: `Could not list ${planDir} on ${ref}: ${String(err)}`,
		};
	}

	// id → path, as the base ref has it.
	const refIds = new Map<string, string>();
	for (const path of listing.split('\n')) {
		if (!path.endsWith('.md')) continue;
		let source: string;
		try {
			source = git(['show', `${ref}:${path}`], cwd);
		} catch {
			continue;
		}
		const id = readId(source);
		if (id) refIds.set(id, path);
	}

	return { ref, refIds };
}

export interface BranchPoint {
	/** The merge-base of `HEAD` and the ref. */
	commit: string;
	/** Repo-relative plan paths that existed at the merge-base. */
	paths: Set<string>;
	error?: undefined;
}

/**
 * The plan files that existed where the branch left the base (BUG-040).
 *
 * `collisionsFrom` needs this to tell apart the two ways a base claimant can be
 * missing from the working tree. If it existed at the merge-base, the branch
 * deleted or renamed it, and one claimant survives the merge. If it did not, the
 * base **added** it after the branch point, the branch never had it, and both
 * claimants survive. Without the merge-base the two look identical, and the
 * second is the most common collision there is: two branches each taking the
 * next free ID.
 *
 * A ref with no merge-base cannot be answered, so it is an error rather than a
 * clean run. That includes a shallow clone whose history stops short of the
 * branch point; the message says how to fetch it.
 */
export function branchPointPaths(
	planDir: string,
	ref: string,
	cwd: string,
): BranchPoint | { error: string } {
	let commit: string;
	try {
		commit = git(['merge-base', 'HEAD', ref], cwd).trim();
	} catch {
		const shallow = (() => {
			try {
				return git(['rev-parse', '--is-shallow-repository'], cwd).trim() === 'true';
			} catch {
				return false;
			}
		})();
		return {
			error:
				`No merge-base between HEAD and "${ref}". Nothing was compared: without it, an ID the base added after the branch point cannot be told from one the branch deleted.\n` +
				(shallow
					? '  This is a shallow clone. Fetch the history first: git fetch --unshallow'
					: `  The two histories are unrelated. Compare against a ref this branch was made from.`),
		};
	}
	try {
		const listing = git(['ls-tree', '-r', '--name-only', commit, '--', planDir], cwd);
		return { commit, paths: new Set(listing.split('\n').filter(Boolean)) };
	} catch (err) {
		return { error: `Could not list ${planDir} at the merge-base ${commit}: ${String(err)}` };
	}
}

/**
 * Given the base ref's ID→path map and the working tree's entities, report the
 * IDs that collide.
 *
 * **A collision is two claimants surviving the merge**, which is this function's
 * contract and the only thing it can establish from paths. The branch adds the ID
 * in one file, the base already spends it on another, and *both files are still
 * there afterwards* — so every `{% ref %}` to that ID becomes ambiguous.
 *
 * It follows that a base file the branch **deleted** is not a collision: the
 * merge applies the deletion and one claimant remains. "Deleted" means present at
 * the branch point and absent now; a base file absent from the tree that was not
 * there at the branch point was added by the base afterwards, and is a collision
 * (BUG-040). That covers the ordinary
 * rename, where an edited title changes the slug
 * (`WORK-603-add-metafields-….md` → `WORK-603-add-fieldmetas-….md`), and it is
 * why the test is the base path's presence rather than a slug comparison.
 *
 * An earlier revision compared slugs, so it forgave only a rename that kept its
 * slug and moved directory — and fired on every title edit, which is the common
 * case, and on `plan migrate filenames` wholesale.
 *
 * **What this deliberately does not catch**: an ID *reused* for a different entity
 * (the base's file deleted, a new one written under the same ID). That also leaves
 * one claimant, so it is not a collision, but it silently repoints every reference
 * — a real hazard, needing content rather than paths to detect, and not a reason to
 * block a merge. In-tree duplicates are a separate matter and already reported at
 * error severity by `checkDuplicateIds`, which runs before this.
 *
 * @param planDir     Plan directory, relative to the repo root.
 * @param branchPoint Repo-relative plan paths at the merge-base (`branchPointPaths`).
 * @param cwd         Repo root — needed to test whether the base's path still exists.
 */
export function collisionsFrom(
	refIds: Map<string, string>,
	entities: { file: string; attributes: { id?: string } }[],
	planDir: string,
	branchPoint: Set<string>,
	cwd = process.cwd(),
): AgainstCollision[] {
	const collisions: AgainstCollision[] = [];
	const refPaths = new Set(refIds.values());
	for (const e of entities) {
		const id = e.attributes.id;
		if (!id) continue;
		const refPath = refIds.get(id);
		if (!refPath) continue;

		// `ls-tree` paths are repo-relative; entity files are plan-dir-relative.
		const refRel = refPath.startsWith(`${planDir}/`) ? refPath.slice(planDir.length + 1) : refPath;
		if (refRel === e.file) continue;

		// The base's claimant is not in the working tree. If the branch had it
		// at the branch point, the branch deleted or moved it — a rename, a move
		// or a deliberate replacement — and the merge leaves one file holding the
		// ID. If it did not, the base added it afterwards, and it is the second
		// claimant this check exists to find (BUG-040).
		if (!existsSync(join(cwd, refPath)) && branchPoint.has(refPath)) continue;

		// The mirror case: the branch's claimant existed at the branch point and
		// the base no longer has it, so the base moved or deleted it and the merge
		// applies that. A base-side rename (`plan migrate filenames`, a retitle on
		// main) leaves one claimant, not two.
		const branchPath = `${planDir}/${e.file}`;
		if (branchPoint.has(branchPath) && !refPaths.has(branchPath)) continue;

		collisions.push({ id, file: e.file, refFile: refRel });
	}
	return collisions;
}

/**
 * The base ref's claimants as `migrate ids` wants them (BUG-026): id →
 * plan-dir-relative path. Same reading as `readRefIds`, so `validate --against`
 * and `migrate ids --against` can never disagree about what the base holds.
 */
export function baseClaimants(
	planDir: string,
	ref: string,
	cwd: string,
): { ref: string; files: Map<string, string> } | { error: string } {
	const index = readRefIds(planDir, ref, cwd);
	if (index.error) return { error: index.error };
	const files = new Map<string, string>();
	for (const [id, path] of index.refIds) {
		files.set(id, path.startsWith(`${planDir}/`) ? path.slice(planDir.length + 1) : path);
	}
	return { ref, files };
}
