/**
 * Compile every case and report.
 *
 * Positives in `cases/` must compile clean. Negatives in `negative/` use
 * `@ts-expect-error`, so they ALSO compile clean — but only if every expected
 * error actually fires. If inference regresses and an error stops firing, the
 * directive becomes unused and tsc fails. That is the assertion.
 *
 * `--show` additionally strips the directives and prints the real messages, so
 * the findings can quote them rather than paraphrase.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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

function compile(file) {
	try {
		execFileSync('npx', [...TSC, file], { encoding: 'utf8', stdio: 'pipe' });
		return { ok: true, out: '' };
	} catch (e) {
		return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() };
	}
}

const show = process.argv.includes('--show');
const files = [
	...readdirSync('cases').map((f) => join('cases', f)),
	...readdirSync('negative').map((f) => join('negative', f)),
];

let failed = 0;
for (const file of files) {
	const { ok, out } = compile(file);
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${file}`);
	if (!ok) {
		failed++;
		console.log(
			out
				.split('\n')
				.map((l) => `      ${l}`)
				.join('\n'),
		);
	}
	if (show && file.startsWith('negative')) {
		const tmp = `${file}.stripped.ts`;
		writeFileSync(tmp, readFileSync(file, 'utf8').replace(/^\s*\/\/ @ts-expect-error.*$/gm, ''));
		console.log(
			compile(tmp)
				.out.split('\n')
				.map((l) => `      ${l}`)
				.join('\n'),
		);
		unlinkSync(tmp);
	}
}
console.log(failed === 0 ? '\nAll cases pass.' : `\n${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
