import type { Config, CustomAttributeTypeInterface, ValidationError } from '@markdoc/markdoc';

/**
 * A note on `level`, for all the validators in this file (SPEC-132 D11).
 *
 * These returned `level: 'critical'` for `attribute-type-invalid`, while Markdoc
 * emits that same id at `error`. The identical failure was reported at two
 * severities depending on which code path produced it — harmless while nothing
 * read severity, and wrong the moment SPEC-132 made it load-bearing, because
 * `critical` means "the document could not be understood" and is therefore not
 * suppressible by configuration. An out-of-range attribute plainly does not
 * qualify.
 *
 * They also never executed in a build before SPEC-132: `transform()` does not
 * invoke a custom type's `validate()`, only `Markdoc.validate()` does. This is
 * the first release in which any of this code runs over a user's content.
 */
export abstract class SeparatedString implements CustomAttributeTypeInterface {
	validate(value: any, config: Config, name: string): ValidationError[] {
		if (typeof value !== 'string') {
			return [
				{
					id: 'attribute-type-invalid',
					level: 'error',
					message: `Attribute '${name}' is not a string`,
				},
			];
		}
		return [];
	}
}

export class CommaSeparatedList extends SeparatedString {
	transform(value: string | undefined) {
		return value ? value.split(',').map((v) => v.trim()) : [];
	}
}

export class SpaceSeparatedList extends SeparatedString {
	transform(value: string | undefined) {
		return value ? value.split(' ').map((v) => v.trim()) : [];
	}
}

export class SpaceSeparatedNumberList extends SeparatedString {
	transform(value: string | undefined) {
		return value ? value.split(' ').map((v) => parseInt(v.trim())) : [];
	}

	validate(value: any, config: Config, name: string): ValidationError[] {
		const errors = super.validate(value, config, name);

		if (errors.length > 0) return errors;

		const items = value.split(' ');

		if (items.some((v: any) => isNaN(v))) {
			return [
				{
					id: 'attribute-type-invalid',
					level: 'error',
					message: `Attribute '${name}' contains non-numeric value: '${items.find((v: any) => isNaN(v))}'`,
				},
			];
		}
		return [];
	}
}
