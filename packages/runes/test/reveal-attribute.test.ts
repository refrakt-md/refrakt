import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';

/** Validate a Markdoc source against the rune schemas and return the entries. */
function validate(src: string) {
	const ast = Markdoc.parse(src);
	return Markdoc.validate(ast, { tags, nodes } as never);
}

// SPEC-105 / WORK-431 — `reveal` is a closed, author-facing vocabulary on every
// block rune (a universal attribute). An unknown value must be a build error, so
// the author↔theme contract stays enforceable. Markdoc's `matches` does the work.
describe('reveal universal attribute (SPEC-105)', () => {
	it('accepts every value in the closed vocabulary', () => {
		for (const value of ['none', 'fade', 'slide', 'scale', 'blur']) {
			const errors = validate(`{% card reveal="${value}" %}\n# T\nbody\n{% /card %}`);
			expect(errors, `reveal="${value}" should validate`).toEqual([]);
		}
	});

	it('rejects an unknown reveal value as a build error', () => {
		const errors = validate('{% card reveal="zoom" %}\n# T\nbody\n{% /card %}');
		const invalid = errors.find(e => e.error.id === 'attribute-value-invalid');
		expect(invalid, 'expected an attribute-value-invalid error for reveal="zoom"').toBeDefined();
		expect(invalid!.error.level).toBe('error');
	});

	it('accepts the boolean stagger flag', () => {
		const errors = validate('{% card stagger=true %}\n# T\nbody\n{% /card %}');
		expect(errors).toEqual([]);
	});

	it('rejects a non-boolean stagger value', () => {
		const errors = validate('{% card stagger="yes" %}\n# T\nbody\n{% /card %}');
		const invalid = errors.find(e => e.error.id === 'attribute-type-invalid');
		expect(invalid, 'expected an attribute-type-invalid error for stagger="yes"').toBeDefined();
	});
});
