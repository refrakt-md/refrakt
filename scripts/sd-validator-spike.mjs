/**
 * Run `@adobe/structured-data-validator` over the SEO baseline (WORK-628).
 *
 * SPEC-145 D25 bans `schema` in a user's own composition definition until a
 * mechanical check exists, and names this validator as the candidate. This
 * script measures it against a known answer: `contracts/seo-baseline/` records
 * every rune's JSON-LD *including its defects*, and the baseline's history
 * records the defects SPEC-130 has since fixed. So for each defect we know
 * whether a check should have fired, and for each clean row we know it should
 * not.
 *
 * Spike only. The validator is not a dependency of any package in this repo;
 * install it somewhere scratch and point the script at it. The findings are
 * written up in SPEC-145 under D25.
 *
 * ## The vocabulary
 *
 * The validator bundles no ontology: it takes schema.org's
 * `schemaorg-all-https.jsonld` as a constructor argument. This script pins one
 * release by version and sha256 and fetches it from the schemaorg/schemaorg
 * repository's `data/releases/<version>/` directory (release directories are
 * never rewritten upstream). `schema.org` itself serves the same file at
 * `/version/<version>/`, but a sandboxed CI or build may not reach it — this
 * one could not — so the repository copy is the one pinned here. Pass
 * `--vocab <file>` to use a local copy instead.
 *
 * Usage:
 *   npm install --prefix <scratch> @adobe/structured-data-validator@1.7.0
 *   SDV_DIR=<scratch>/node_modules/@adobe/structured-data-validator \
 *     node scripts/sd-validator-spike.mjs [--ref <git-ref>]... [--vocab <file>] [--json]
 *
 * With no `--ref` the working-tree baseline is validated. Each `--ref` adds the
 * baseline as committed at that ref, so a defect fixed since can be checked
 * against the version that still had it. The synthetic probes (D25's own
 * examples) always run.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = 'contracts/seo-baseline/baseline.json';

const VALIDATOR_VERSION = '1.7.0';
const VOCAB_VERSION = '30.1';
const VOCAB_SHA256 = '07e7c663dbc12a0937581745e59a98ed12b8698f38e8e3b03650287d9df88ae5';
const VOCAB_URL = `https://raw.githubusercontent.com/schemaorg/schemaorg/main/data/releases/${VOCAB_VERSION}/schemaorg-all-https.jsonld`;

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const refs = args.flatMap((a, i) => (a === '--ref' ? [args[i + 1]] : []));
const vocabFlag = args.indexOf('--vocab');

/**
 * Synthetic rows. D25 states the risk with an example (`Person { cookTime }`),
 * and the baseline cannot contain it because no first-party table writes it.
 * Each probe names the defect class it stands for, so a miss is attributable.
 */
const PROBES = [
	{
		fixture: 'probe.wrong-property',
		notes: "D25's own example: a property schema.org defines, on a type it does not belong to.",
		jsonLd: [
			{ '@context': 'https://schema.org', '@type': 'Person', name: 'Ada', cookTime: 'PT1H' },
		],
	},
	{
		fixture: 'probe.misspelt-property',
		notes: 'A property name schema.org does not define at all.',
		jsonLd: [{ '@context': 'https://schema.org', '@type': 'Person', name: 'Ada', jobtitle: 'CTO' }],
	},
	{
		fixture: 'probe.misspelt-type',
		notes: 'A type schema.org does not define — the old `NonProfit` defect, in its pure form.',
		jsonLd: [{ '@context': 'https://schema.org', '@type': 'Persn', name: 'Ada' }],
	},
	{
		fixture: 'probe.wrong-range',
		notes:
			'A real property on the right type with a value of the wrong kind (a string where a Person/Organization is expected, and prose where a Duration is).',
		jsonLd: [
			{
				'@context': 'https://schema.org',
				'@type': 'Book',
				name: 'Refrakt',
				author: { '@type': 'Rating', ratingValue: 5 },
				timeRequired: 'an afternoon',
			},
		],
	},
	{
		fixture: 'probe.empty-entity',
		notes: 'A type asserted with nothing to say — the old Group A defect (SPEC-130 D4).',
		jsonLd: [{ '@context': 'https://schema.org', '@type': 'Dataset' }],
	},
	{
		fixture: 'probe.wrong-type-right-shape',
		notes:
			'A real type with properties it really has, for the wrong thing — a map typed as a Place. Only a reader can see this.',
		jsonLd: [{ '@context': 'https://schema.org', '@type': 'Place', name: 'Landmarks of Rome' }],
	},
];

async function loadValidator() {
	const dir = process.env.SDV_DIR;
	try {
		const mod = dir
			? await import(pathToFileURL(join(dir, 'src/index.js')).href)
			: await import('@adobe/structured-data-validator');
		return mod.Validator ?? mod.default;
	} catch {
		console.error(
			`@adobe/structured-data-validator is not installed (this spike does not add it as a dependency).\n` +
				`  npm install --prefix <scratch> @adobe/structured-data-validator@${VALIDATOR_VERSION}\n` +
				`  SDV_DIR=<scratch>/node_modules/@adobe/structured-data-validator node scripts/sd-validator-spike.mjs`,
		);
		process.exit(2);
	}
}

async function loadVocabulary() {
	let text;
	if (vocabFlag !== -1) {
		text = readFileSync(args[vocabFlag + 1], 'utf8');
	} else {
		const cache = join(
			ROOT,
			'node_modules/.cache/sd-validator-spike',
			`schemaorg-${VOCAB_VERSION}.jsonld`,
		);
		if (existsSync(cache)) {
			text = readFileSync(cache, 'utf8');
		} else {
			const res = await fetch(VOCAB_URL);
			if (!res.ok) throw new Error(`fetching ${VOCAB_URL}: HTTP ${res.status}`);
			text = await res.text();
			mkdirSync(dirname(cache), { recursive: true });
			writeFileSync(cache, text);
		}
	}
	const sha = createHash('sha256').update(text).digest('hex');
	if (vocabFlag === -1 && sha !== VOCAB_SHA256) {
		throw new Error(`schema.org ${VOCAB_VERSION} vocabulary hash mismatch: got ${sha}`);
	}
	return { json: JSON.parse(text), sha, bytes: Buffer.byteLength(text) };
}

function readBaseline(ref) {
	const text = ref
		? execFileSync('git', ['show', `${ref}:${BASELINE}`], { cwd: ROOT, encoding: 'utf8' })
		: readFileSync(join(ROOT, BASELINE), 'utf8');
	return JSON.parse(text).fixtures;
}

/**
 * The validator expects `@marbec/web-auto-extractor` output: entities grouped
 * by root `@type` under a format key. The baseline already holds the parsed
 * JSON-LD, so the extractor (an HTML parser) is not needed to build that shape.
 */
function toExtractorShape(jsonLd) {
	const jsonld = {};
	for (const entity of jsonLd) {
		const type = Array.isArray(entity['@type']) ? entity['@type'][0] : entity['@type'];
		jsonld[type] ??= [];
		jsonld[type].push(structuredClone(entity));
	}
	return { jsonld, microdata: {}, rdfa: {} };
}

function describePath(path = []) {
	return path
		.map(
			(p) => [p.property, p.type].filter(Boolean).join(':') + (p.length > 1 ? `[${p.index}]` : ''),
		)
		.join(' > ');
}

async function run(Validator, vocab, label, fixtures) {
	const rows = [];
	let ms = 0;
	for (const f of fixtures) {
		const start = performance.now();
		const issues = await new Validator(vocab).validate(toExtractorShape(f.jsonLd));
		ms += performance.now() - start;
		rows.push({
			fixture: f.fixture,
			notes: f.notes,
			entities: f.jsonLd.length,
			issues: issues.map((i) => ({
				severity: i.severity,
				source: i.errorType === 'schemaOrg' ? 'schema.org' : 'rich-result',
				at: describePath(i.path),
				message: i.issueMessage,
			})),
		});
	}
	return { label, fixtures: rows, ms: Math.round(ms) };
}

const Validator = await loadValidator();
const vocab = await loadVocabulary();
const t0 = performance.now();
const runs = [];
if (refs.length === 0) runs.push(await run(Validator, vocab.json, 'working tree', readBaseline()));
for (const ref of refs) runs.push(await run(Validator, vocab.json, ref, readBaseline(ref)));
runs.push(await run(Validator, vocab.json, 'probes', PROBES));
const totalMs = Math.round(performance.now() - t0);

const meta = {
	validator: VALIDATOR_VERSION,
	vocabulary: { version: VOCAB_VERSION, sha256: vocab.sha, bytes: vocab.bytes },
	totalMs,
};

if (asJson) {
	console.log(JSON.stringify({ meta, runs }, null, '\t'));
} else {
	console.log(
		`validator ${meta.validator}, schema.org ${VOCAB_VERSION} (${(vocab.bytes / 1e6).toFixed(1)} MB), ${totalMs} ms total\n`,
	);
	for (const r of runs) {
		const issues = r.fixtures.flatMap((f) => f.issues);
		const errors = issues.filter((i) => i.severity === 'ERROR').length;
		console.log(
			`== ${r.label}: ${r.fixtures.length} fixtures, ${errors} errors, ${issues.length - errors} warnings, ${r.ms} ms`,
		);
		for (const f of r.fixtures) {
			if (f.issues.length === 0) {
				console.log(`  ${f.fixture}: clean`);
				continue;
			}
			console.log(`  ${f.fixture}:`);
			for (const i of f.issues)
				console.log(`    ${i.severity} [${i.source}] ${i.at}: ${i.message}`);
		}
		console.log('');
	}
}
