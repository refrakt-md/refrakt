/**
 * Generate `src/examples.ts` (`RUNE_EXAMPLES`) from the `fixtures/*.md` source of
 * truth (SPEC-102 / WORK-411). Each fixture is Markdoc with optional YAML
 * frontmatter; the canonical body (frontmatter stripped) becomes the rune's
 * example string. Runs before `tsc` in the package build; a drift test
 * (`test/examples-generation.test.ts`) guards the committed output. Never
 * hand-edit `src/examples.ts` — edit the fixture `.md` files and rebuild.
 *
 * Frontmatter *fields* (role / attributes / scenarios) are populated and
 * consumed in WORK-412; this step only strips the block and keys by filename.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

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

/** Render the `examples.ts` module from `fixtures/*.md`. */
export function renderExamples() {
	const files = readdirSync(fixturesDir)
		.filter(f => f.endsWith('.md') && !f.slice(0, -3).includes('.')) // canonical only; scenarios (WORK-412) excluded
		.sort();

	const entries = files.map(f => {
		const rune = f.slice(0, -3);
		const body = stripFrontmatter(readFileSync(resolve(fixturesDir, f), 'utf-8')).trim();
		return `\t${JSON.stringify(rune)}: ${JSON.stringify(body)},`;
	});

	return `${HEADER}
/** Generated example Markdoc snippets, keyed by rune name. Source: fixtures/*.md. */
export const RUNE_EXAMPLES: Record<string, string> = {
${entries.join('\n')}
};
`;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMain) {
	writeFileSync(outPath, renderExamples());
	console.log(`Generated src/examples.ts from ${fixturesDir}`);
}
