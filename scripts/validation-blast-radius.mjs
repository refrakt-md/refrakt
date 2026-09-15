/**
 * Measure what content validation reports across every configured site.
 *
 * WORK-557 (SPEC-132 phase 2's gate). Phase 2 enables the attribute error ids,
 * which also wake the custom attribute validators that have never executed in a
 * build. Nobody knew what that reports, and the difference between "a handful"
 * and "hundreds concentrated in one rune" is the difference between fixing them
 * inside WORK-558 and splitting phase 2 out of the milestone.
 *
 * Measurement only — this enables every id regardless of the shipped
 * allow-list, and fixes nothing. The deliverable is the numbers.
 *
 * Usage:
 *   node scripts/validation-blast-radius.mjs            # every site, summary
 *   node scripts/validation-blast-radius.mjs --json      # machine-readable
 *   node scripts/validation-blast-radius.mjs --site main # one site
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = (() => {
	let dir = dirname(fileURLToPath(import.meta.url));
	while (dir !== '/') {
		if (existsSync(join(dir, 'refrakt.config.json'))) return dir;
		const parent = join(dir, '..');
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error('repo root not found');
})();

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const siteFlag = args.indexOf('--site');
const onlySite = siteFlag === -1 ? undefined : args[siteFlag + 1];

const { loadContent } = await import(join(ROOT, 'packages/content/dist/index.js'));
const {
	loadPlugin,
	mergePlugins,
	runes: coreRunes,
} = await import(join(ROOT, 'packages/runes/dist/index.js'));
const coreRuneNames = new Set(Object.keys(coreRunes));

const config = JSON.parse(readFileSync(join(ROOT, 'refrakt.config.json'), 'utf-8'));
const sites = config.sites ?? { main: config };

/** Every id Markdoc can emit that this measurement cares about, including the
 *  ones the shipped allow-list does not carry. `variable-undefined` stays out:
 *  SPEC-132 D4 measured it as unusable (no scope model, full-path checking),
 *  and including it would swamp every other number with false positives. */
const MEASURED_IDS = [
	'tag-undefined',
	'attribute-undefined',
	'attribute-value-invalid',
	'attribute-missing-required',
	'attribute-type-invalid',
];

/** The four validators SPEC-132 D11 flags as never having run in a build —
 *  `SeparatedString` and `SpaceSeparatedNumberList` in
 *  `packages/runes/src/attributes.ts`, and the pair in
 *  `plugins/media/src/attributes.ts`. All four share the `attribute-type-invalid`
 *  id with Markdoc's own type check, so they are told apart by message: theirs
 *  are the only two phrasings below. Counted separately because they are the
 *  least predictable part of phase 2. */
function isCustomValidatorFinding(message) {
	return (
		/Attribute '[^']+' is not a string/.test(message) ||
		/Attribute '[^']+' contains non-numeric value/.test(message)
	);
}

function runeOf(message) {
	const m = /'([a-z0-9-]+)' tag/.exec(message) ?? /Undefined tag: '([^']+)'/.exec(message);
	return m ? m[1] : null;
}

const report = {};

for (const [name, site] of Object.entries(sites)) {
	if (onlySite && name !== onlySite) continue;

	const plugins = [];
	for (const spec of site.plugins ?? []) {
		try {
			plugins.push(await loadPlugin(spec));
		} catch (err) {
			console.error(`  ! could not load plugin ${spec}: ${err.message}`);
		}
	}
	const merged = plugins.length
		? mergePlugins(plugins, coreRuneNames, site.runes?.prefer)
		: undefined;

	// Mirror the adapter: each plugin's `configure` runs before the pipeline, or
	// plugins that scan the project at configure time (the plan plugin reads
	// `plan.dir` to drive its unconditional entity scan) contribute nothing and
	// the measurement silently covers 6 pages instead of 700.
	for (const pkg of merged?.plugins ?? []) {
		if (pkg.pipeline?.configure) {
			await pkg.pipeline.configure({ config, configDir: ROOT });
		}
	}

	const loaded = await loadContent(
		resolve(ROOT, site.contentDir),
		'/',
		undefined,
		merged?.tags,
		merged?.plugins ?? [],
		site.sandbox?.dir ? resolve(ROOT, site.sandbox.dir) : undefined,
		undefined,
		undefined,
		ROOT,
		undefined,
		undefined,
		// Force every measured id on, whatever the shipped default is.
		{ ...site, validation: { enabled: true, ids: MEASURED_IDS } },
		site.repoUrl,
		site.repoBranch,
	);

	const findings = loaded.pipelineWarnings.filter((w) => w.phase === 'validate');
	const byId = {};
	const byRune = {};
	const byLevel = { critical: 0, error: 0, other: 0 };
	let customValidator = 0;

	for (const f of findings) {
		const id = /^([a-z-]+):/.exec(f.message)?.[1] ?? 'unknown';
		byId[id] = (byId[id] ?? 0) + 1;
		const rune = runeOf(f.message);
		if (rune) byRune[rune] = (byRune[rune] ?? 0) + 1;
		// `critical` is the band SPEC-132 D11 makes non-suppressible, so it is
		// counted apart from the configurable `error` band.
		if (f.severity === 'error') byLevel.error += 1;
		else byLevel.other += 1;
		if (isCustomValidatorFinding(f.message)) customValidator += 1;
	}

	report[name] = {
		pages: loaded.pages.length,
		total: findings.length,
		byId,
		byRune: Object.fromEntries(
			Object.entries(byRune)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 15),
		),
		bySeverity: byLevel,
		customValidatorFindings: customValidator,
		// Distinct message shapes matter more than raw samples: 3,309 findings
		// turned out to be one message repeated, which is the difference between
		// "phase 2 is a week of work" and "phase 2 is one decision".
		distinctMessages: Object.entries(
			findings.reduce((acc, f) => {
				const key = f.message.replace(/\(line \d+\)/, '').trim();
				acc[key] = (acc[key] ?? 0) + 1;
				return acc;
			}, {}),
		)
			.sort((a, b) => b[1] - a[1])
			.map(([msg, n]) => `${n}× ${msg}`),
		samples: findings.slice(0, 12).map((f) => `${f.url} — ${f.message}`),
	};
}

if (asJson) {
	console.log(JSON.stringify(report, null, 2));
} else {
	for (const [name, r] of Object.entries(report)) {
		console.log(`\n=== ${name} (${r.pages} pages) — ${r.total} findings`);
		console.log('  by error id:');
		for (const [id, n] of Object.entries(r.byId).sort((a, b) => b[1] - a[1])) {
			console.log(`    ${String(n).padStart(6)}  ${id}`);
		}
		console.log('  by rune (top 15):');
		for (const [rune, n] of Object.entries(r.byRune)) {
			console.log(`    ${String(n).padStart(6)}  ${rune}`);
		}
		console.log(`  custom-validator findings: ${r.customValidatorFindings}`);
		console.log('  distinct messages:');
		for (const m of r.distinctMessages) console.log(`    ${m}`);
		console.log('  samples:');
		for (const s of r.samples) console.log(`    ${s}`);
	}
}
