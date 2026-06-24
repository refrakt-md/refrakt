import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import Ajv from 'ajv';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(resolve(here, '..', 'theme-tokens.schema.json'), 'utf-8'));

// Mirror of the TokenContract top-level namespaces (packages/types/src/token-contract.ts).
// A drift guard: if the contract gains/loses a namespace, this list — and the
// schema — must be updated together (WORK-458).
const EXPECTED_NAMESPACES = [
	'font', 'text', 'weight', 'leading', 'tracking',
	'color', 'radius', 'spacing', 'shadow', 'syntax', 'reveal',
];

describe('theme-tokens.schema.json', () => {
	const ajv = new Ajv({ allErrors: true, strict: false });
	const validate = ajv.compile(schema);

	it('declares exactly the contract namespaces (+ modes/extra/$schema)', () => {
		const props = Object.keys(schema.properties).sort();
		const expected = [...EXPECTED_NAMESPACES, 'modes', 'extra', '$schema'].sort();
		expect(props).toEqual(expected);
	});

	it('accepts a syntax-scoped preset (the scaffold default)', () => {
		const ember = {
			$schema: 'https://refrakt.md/schemas/v0.25/theme-tokens.json',
			syntax: { keyword: '#c2410c', function: '#b45309', string: '#3f6212' },
		};
		expect(validate(ember)).toBe(true);
	});

	it('accepts a palette preset with chrome + surface + sentiment + dark mode', () => {
		const tideline = {
			color: {
				text: '#1d3557', bg: '#faf5eb', primary: '#457b9d',
				surface: { base: '#fffaf0' },
				info: { base: '#457b9d', bg: '#edf4f8', border: '#a8dadc' },
				code: { bg: '#1d3557' },
			},
			syntax: { keyword: '#e63946' },
			modes: { dark: { color: { bg: '#152238', text: '#f1faee' } } },
		};
		expect(validate(tideline)).toBe(true);
	});

	it('rejects an unknown top-level key (typo guard)', () => {
		expect(validate({ colors: { bg: '#fff' } })).toBe(false);
	});

	it('rejects a non-string scalar token value', () => {
		expect(validate({ color: { bg: 123 } })).toBe(false);
	});
});
