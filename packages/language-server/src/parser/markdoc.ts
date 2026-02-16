import Markdoc from '@markdoc/markdoc';
import type { ValidateError } from '@markdoc/markdoc';
import { getMarkdocTags, getMarkdocNodes } from '../registry/loader.js';

/**
 * Parse a Markdoc document string into an AST.
 */
export function parse(content: string) {
  return Markdoc.parse(content);
}

/**
 * Validate a Markdoc AST using the full rune tag/node configuration.
 * Returns an array of validation errors.
 */
export function validate(content: string): ValidateError[] {
  const ast = Markdoc.parse(content);
  return Markdoc.validate(ast, {
    tags: getMarkdocTags(),
    nodes: getMarkdocNodes(),
  });
}
