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
import { basename } from 'node:path';

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

/**
 * Given the base ref's ID→path map and the working tree's entities, report the
 * IDs that collide.
 *
 * Paths are compared by basename-less ID prefix rather than raw path, because a
 * file legitimately renamed on the branch (`WORK-583-old-slug.md` →
 * `WORK-583-new-slug.md`) is the same entity, not a collision.
 */
export function collisionsFrom(
	refIds: Map<string, string>,
	entities: { file: string; attributes: { id?: string } }[],
	planDir: string,
): AgainstCollision[] {
	const collisions: AgainstCollision[] = [];
	for (const e of entities) {
		const id = e.attributes.id;
		if (!id) continue;
		const refPath = refIds.get(id);
		if (!refPath) continue;

		// `ls-tree` paths are repo-relative; entity files are plan-dir-relative.
		const refRel = refPath.startsWith(`${planDir}/`) ? refPath.slice(planDir.length + 1) : refPath;
		if (refRel === e.file) continue;

		// Same ID, same slug, different directory or prefix — a rename of the
		// same entity, not a second claimant.
		if (stripId(basename(refRel), id) === stripId(basename(e.file), id)) continue;

		collisions.push({ id, file: e.file, refFile: refRel });
	}
	return collisions;
}

function stripId(name: string, id: string): string {
	return name.startsWith(`${id}-`) ? name.slice(id.length + 1) : name;
}
