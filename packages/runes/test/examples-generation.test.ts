import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// @ts-expect-error — plain .mjs build script, no type declarations.
import { renderExamples, stripFrontmatter } from '../scripts/generate-examples.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const examplesPath = resolve(here, '..', 'src', 'examples.ts');

describe('RUNE_EXAMPLES is generated from fixtures/*.md', () => {
	it('src/examples.ts matches the generated output (no drift)', () => {
		expect(readFileSync(examplesPath, 'utf-8')).toBe(renderExamples() as string);
	});

	it('stripFrontmatter removes a leading YAML block but leaves bodies without one', () => {
		expect(stripFrontmatter('---\nrune: hint\n---\n\n{% hint %}x{% /hint %}')).toBe('\n{% hint %}x{% /hint %}');
		expect(stripFrontmatter('{% hint %}x{% /hint %}')).toBe('{% hint %}x{% /hint %}');
	});
});
