/**
 * Compile-time cost of the inference, measured rather than guessed.
 *
 * Generates N runes in the HEAVIEST shape (sections + knownSections + a nested
 * sectionModel) twice — once against the inferring builder, once against a
 * loose one — and times tsc on each. This is the pessimistic number: the real
 * repo is 87 `sequence`, 13 `sections` and only 3 with `knownSections`.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

const N = Number(process.argv[2] ?? 121);
const TSC = [
	'tsc',
	'--noEmit',
	'--strict',
	'--skipLibCheck',
	'--target',
	'es2022',
	'--moduleResolution',
	'bundler',
	'--module',
	'esnext',
];

const rune = (i, fn) => `
export const r${i} = ${fn}({
	contentModel: () => ({
		type: 'sections', sectionHeading: 'heading:2',
		fields: [
			{ name: 'title', match: 'heading', optional: false },
			{ name: 'description', match: 'paragraph', optional: true, greedy: true },
		],
		sectionModel: { type: 'sequence', fields: [{ name: 'body', match: 'any', optional: true, greedy: true }] },
		knownSections: {
			'Acceptance Criteria': { alias: ['Criteria', 'AC', 'Done When'] },
			'Blocked by': { alias: ['Depends On', 'Requires'] },
			Blocks: { alias: ['Unblocks', 'Enables'] },
			Approach: { alias: ['Technical Notes', 'How'] },
			References: { alias: ['Refs', 'Related'] },
			'Edge Cases': { alias: ['Exceptions'] },
			Verification: { alias: ['Tests'] },
		},
	}) as const,
	transform(resolved) { return [resolved.title, resolved.sections]; },
});`;

const variants = {
	loose: `declare function loose(o: { contentModel: unknown; transform: (r: Record<string, unknown>) => unknown }): unknown;\n`,
	typed: `import { createContentModelSchema } from './infer.js';\n`,
};

function time(name, header, fn) {
	const file = `bench_${name}.ts`;
	writeFileSync(file, header + Array.from({ length: N }, (_, i) => rune(i, fn)).join('\n'));
	const t0 = performance.now();
	try {
		execFileSync('npx', [...TSC, file], { stdio: 'pipe' });
	} catch {
		/* shape only */
	}
	const ms = Math.round(performance.now() - t0);
	unlinkSync(file);
	return ms;
}

console.log(`${N} runes, heaviest shape (sections + knownSections + nested sectionModel)\n`);
for (const run of [1, 2]) {
	const loose = time('loose', variants.loose, 'loose');
	const typed = time('typed', variants.typed, 'createContentModelSchema');
	console.log(
		`  run ${run}:  loose ${loose} ms   typed ${typed} ms   (+${Math.round(((typed - loose) / loose) * 100)}%)`,
	);
}
