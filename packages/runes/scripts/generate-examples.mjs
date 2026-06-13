/**
 * Generate `src/examples.ts` (`RUNE_EXAMPLES` + `RUNE_FIXTURE_META`) from the
 * `fixtures/*.md` source of truth (SPEC-102 / WORK-411). Each fixture is
 * Markdoc with optional YAML frontmatter; the canonical body (frontmatter
 * stripped) becomes the rune's example string, and the curation fields (`role`,
 * `notes`) are captured into `RUNE_FIXTURE_META` so consumers like the AI write
 * mode (WORK-413) can select exemplars by role and surface their notes —
 * fixtures aren't shipped in the published package, so this bakes the metadata
 * into the bundle. Runs before `tsc` in the package build; a drift test
 * (`test/examples-generation.test.ts`) guards the committed output. Never
 * hand-edit `src/examples.ts` — edit the fixture `.md` files and rebuild.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, '..', 'fixtures');
const outPath = resolve(here, '..', 'src', 'examples.ts');

const HEADER =
	'// GENERATED from fixtures/*.md by scripts/generate-examples.mjs — do not edit by hand.\n' +
	'// Edit the fixture .md files and rebuild; a drift test guards this file.\n';

/** Strip a leading YAML frontmatter block (`---\n…\n---`). */
export function stripFrontmatter(src) {
	const m = src.match(/^---\n[\s\S]*?\n---\n?/);
	return m ? src.slice(m[0].length) : src;
}

/** Parse a leading YAML frontmatter block into an object (`{}` when absent). */
export function readFrontmatter(src) {
	const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!m) return {};
	const parsed = parseYaml(m[1] ?? '');
	return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

/** Render the `examples.ts` module from `fixtures/*.md`. */
export function renderExamples() {
	const files = readdirSync(fixturesDir)
		.filter(f => f.endsWith('.md') && !f.slice(0, -3).includes('.')) // canonical only; scenarios (WORK-412) excluded
		.sort();

	const exampleEntries = [];
	const metaEntries = [];

	for (const f of files) {
		const rune = f.slice(0, -3);
		const raw = readFileSync(resolve(fixturesDir, f), 'utf-8');
		const body = stripFrontmatter(raw).trim();
		exampleEntries.push(`\t${JSON.stringify(rune)}: ${JSON.stringify(body)},`);

		// Capture only the curation fields, and only when explicitly set — an
		// explicit `role` is the opt-in signal that a fixture is an exemplar.
		const fm = readFrontmatter(raw);
		const meta = {};
		if (typeof fm.role === 'string') meta.role = fm.role;
		if (typeof fm.notes === 'string') meta.notes = fm.notes;
		if (Object.keys(meta).length > 0) {
			metaEntries.push(`\t${JSON.stringify(rune)}: ${JSON.stringify(meta)},`);
		}
	}

	return `${HEADER}
/** Generated example Markdoc snippets, keyed by rune name. Source: fixtures/*.md. */
export const RUNE_EXAMPLES: Record<string, string> = {
${exampleEntries.join('\n')}
};

/** Curation metadata (\`role\` / \`notes\`) for fixtures that declare it. Source: fixtures/*.md. */
export interface RuneFixtureMeta {
	role?: string;
	notes?: string;
}

export const RUNE_FIXTURE_META: Record<string, RuneFixtureMeta> = {
${metaEntries.join('\n')}
};
`;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMain) {
	writeFileSync(outPath, renderExamples());
	console.log(`Generated src/examples.ts from ${fixturesDir}`);
}
