import { describe, it, expect } from 'vitest';
import { CommaSeparatedList, SpaceSeparatedList, SpaceSeparatedNumberList } from '../src/attributes.js';

describe('CommaSeparatedList', () => {
  const attr = new CommaSeparatedList();

  it('should split comma-separated values and trim whitespace', () => {
    expect(attr.transform('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('should return empty array for undefined', () => {
    expect(attr.transform(undefined)).toEqual([]);
  });

  it('should handle single value', () => {
    expect(attr.transform('solo')).toEqual(['solo']);
  });

  it('should validate that value is a string', () => {
    const errors = attr.validate(42, {}, 'test');
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe('attribute-type-invalid');
  });

  it('should pass validation for strings', () => {
    const errors = attr.validate('valid', {}, 'test');
    expect(errors).toEqual([]);
  });
});

describe('SpaceSeparatedList', () => {
  const attr = new SpaceSeparatedList();

  it('should split space-separated values', () => {
    expect(attr.transform('a b c')).toEqual(['a', 'b', 'c']);
  });

  it('should return empty array for undefined', () => {
    expect(attr.transform(undefined)).toEqual([]);
  });
});

describe('SpaceSeparatedNumberList', () => {
  const attr = new SpaceSeparatedNumberList();

  it('should parse space-separated integers', () => {
    expect(attr.transform('50 50')).toEqual([50, 50]);
  });

  it('should return empty array for undefined', () => {
    expect(attr.transform(undefined)).toEqual([]);
  });

  it('should validate valid number strings', () => {
    const errors = attr.validate('50 50', {}, 'split');
    expect(errors).toEqual([]);
  });

  it('should reject non-numeric values', () => {
    const errors = attr.validate('50 abc', {}, 'split');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('non-numeric');
    expect(errors[0].message).toContain('abc');
  });

  it('should reject non-string input', () => {
    const errors = attr.validate(42, {}, 'split');
    expect(errors).toHaveLength(1);
    expect(errors[0].id).toBe('attribute-type-invalid');
  });
});
