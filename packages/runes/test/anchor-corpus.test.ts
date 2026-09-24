/**
 * The regression corpus (SPEC-131, WORK-587).
 *
 * The spec is explicit that this ships in the same phase as the resolver, "not
 * a follow-up": it is the only thing that will catch a regression in a
 * heuristic, and it is cheap because the repository is its own corpus.
 *
 * **What it guards is the direction of the error, not the rate.** A change that
 * trades a loud refusal for a silent wrong answer is the one this spec exists
 * to prevent, and it would otherwise look like an *improvement* — the exact
 * count goes up. So the assertion is on `silentWrong`, which must stay at or
 * below its recorded baseline, while `exact` has a floor rather than an equals.
 *
 * The oracle is deliberately cheap: for each declaration found by a simple
 * scan, the resolver's slice must *start* at that declaration and be
 * delimiter-balanced.
 *
 * **Its numbers are not comparable to the spec's.** SPEC-131 measured 95.37%
 * exact spans against the TypeScript compiler, which knows where a declaration
 * actually ends. This oracle only checks the start and the balance, so it
 * scores higher and means less. It is not evidence the resolver beat the
 * prototype; it is a tripwire for a change that makes things worse.
 *
 * Baseline recorded 2026-09-24 over 905 declarations in the four directories
 * below:
 *
 * | | count | rate |
 * |---|---|---|
 * | exact | 898 | 99.23% |
 * | loud refusal | 5 | 0.55% |
 * | **silent-wrong** | **0** | **0%** |
 * | duplicate name, not scored | 2 | — |
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AnchorResolutionError, resolveAnchor } from '../src/lib/anchor.js';
import { resolveLanguage } from '../src/lib/languages.js';
import { maskSource } from '../src/lib/mask.js';

const REPO_ROOT = resolve(__dirname, '../../..');

/** Source files to score against. Kept to this package plus two neighbours so
 *  the run stays fast and the baseline stays stable as unrelated areas move. */
const CORPUS_DIRS = [
	'packages/runes/src',
	'packages/transform/src',
	'packages/types/src',
	'packages/content/src',
];

function collect(dir: string, out: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) collect(full, out);
		else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) out.push(full);
	}
	return out;
}

/** Top-level exported declarations, found without the resolver so the oracle
 *  is independent of the thing under test. */
const DECL =
	/^export\s+(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(interface|type|class|const|function|enum)\s+([A-Za-z_$][\w$]*)/;

interface Score {
	total: number;
	exact: number;
	refused: number;
	silentWrong: number;
	/** Declarations whose name occurs earlier in the same file, so the resolver
	 *  legitimately aimed at that first one. Not scored either way. */
	duplicate: number;
	examples: string[];
}

function scoreCorpus(): Score {
	const score: Score = {
		total: 0,
		exact: 0,
		refused: 0,
		silentWrong: 0,
		duplicate: 0,
		examples: [],
	};

	for (const rel of CORPUS_DIRS) {
		for (const file of collect(join(REPO_ROOT, rel))) {
			const source = readFileSync(file, 'utf8');
			const lines = source.split('\n');
			const lang = resolveLanguage(file);
			const shown = file.slice(REPO_ROOT.length + 1);

			lines.forEach((line, i) => {
				const m = DECL.exec(line);
				if (!m) return;
				const name = m[2];
				score.total++;

				let resolved: ReturnType<typeof resolveAnchor>;
				try {
					resolved = resolveAnchor(source, lang, { symbol: name, doc: false }, shown);
				} catch (err) {
					if (err instanceof AnchorResolutionError) {
						score.refused++;
						return;
					}
					throw err;
				}

				// The resolver enumerates matches in file order and takes the
				// first, so a later duplicate name legitimately resolves to the
				// earlier one. Only score the declaration it actually aimed at.
				if (resolved.start - 1 !== i) {
					score.duplicate++;
					return;
				}

				const slice = lines.slice(resolved.start - 1, resolved.end).join('\n');
				const masked = maskSource(slice, lang);
				let brace = 0;
				let paren = 0;
				let bracket = 0;
				for (const ch of masked) {
					if (ch === '{') brace++;
					else if (ch === '}') brace--;
					else if (ch === '(') paren++;
					else if (ch === ')') paren--;
					else if (ch === '[') bracket++;
					else if (ch === ']') bracket--;
				}

				const balanced = brace === 0 && paren === 0 && bracket === 0;
				const startsRight = lines[resolved.start - 1].includes(name);

				if (balanced && startsRight) {
					score.exact++;
				} else {
					score.silentWrong++;
					if (score.examples.length < 10) {
						score.examples.push(`${shown}:${resolved.start}-${resolved.end} (${name})`);
					}
				}
			});
		}
	}

	return score;
}

describe('anchor resolver — regression corpus', () => {
	const score = scoreCorpus();

	it('scores a meaningful number of declarations', () => {
		// A corpus that silently stopped finding anything would make every
		// assertion below vacuous.
		expect(score.total).toBeGreaterThan(500);
	});

	it('holds the silent-wrong count at or below its recorded baseline', () => {
		// THE assertion. A change trading loud-fail for silent-wrong must fail
		// here even if it improves the exact count.
		//
		// Baseline recorded 2026-09-24 at 0. Raising this number is a decision
		// about the spec's central guarantee, not a test fix — if a change
		// needs it raised, that belongs in review with the reason.
		expect(score.silentWrong, `silent-wrong examples:\n${score.examples.join('\n')}`).toBe(0);
	});

	it('resolves the large majority exactly', () => {
		// A floor, not an equals: adding source files should not fail the suite.
		// A floor well under the 99.23% measured, so adding source files does
		// not fail the suite — the silent-wrong assertion above is the one with
		// teeth.
		const rate = score.exact / score.total;
		expect(rate).toBeGreaterThan(0.95);
	});

	it('refuses rather than guessing on the remainder', () => {
		// Whatever is not exact must be a refusal. This is the invariant the
		// spec's "loud-fail, not silent-wrong" claim actually rests on.
		expect(score.exact + score.refused + score.silentWrong + score.duplicate).toBe(score.total);
		expect(score.refused / score.total).toBeLessThan(0.05);
	});
});
