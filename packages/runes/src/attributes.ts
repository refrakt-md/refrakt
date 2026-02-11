import type { Config, CustomAttributeTypeInterface, ValidationError } from '@markdoc/markdoc';

export abstract class SeparatedString implements CustomAttributeTypeInterface {
  validate(value: any, config: Config, name: string): ValidationError[] {
    if (typeof value !== 'string') {
      return [
        {
          id: 'attribute-type-invalid',
          level: 'critical',
          message: `Attribute '${name}' is not a string`,
        }
      ];
    }
    return [];
  }
}

export class CommaSeparatedList extends SeparatedString {
  transform(value: string | undefined) {
    return value ? value.split(',').map(v => v.trim()) : [];
  }
}

export class SpaceSeparatedList extends SeparatedString {
  transform(value: string | undefined) {
    return value ? value.split(' ').map(v => v.trim()) : [];
  }
}

export class SpaceSeparatedNumberList extends SeparatedString {
  transform(value: string | undefined) {
    return value ? value.split(' ').map(v => parseInt(v.trim())) : [];
  }

  validate(value: any, config: Config, name: string): ValidationError[] {
    const errors = super.validate(value, config, name);

    if (errors.length > 0)
      return errors;

    const items = value.split(' ');

    if (items.some((v: any) => isNaN(v))) {
      return [
        {
          id: 'attribute-type-invalid',
          level: 'critical',
          message: `Attribute '${name}' contains non-numeric value: '${items.find((v: any) => isNaN(v))}'`,
        }
      ];
    }
    return [];
  }
}
