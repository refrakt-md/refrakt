import { describe, it, expect } from 'vitest';
import { getTagContext, findUnclosedTags } from '../src/parser/document.js';

describe('getTagContext', () => {
  it('returns undefined outside a tag', () => {
    expect(getTagContext('Hello world')).toBeUndefined();
  });

  it('returns undefined after a closed tag', () => {
    expect(getTagContext('{% hint type="note" %} some text')).toBeUndefined();
  });

  it('detects partial tag name', () => {
    const ctx = getTagContext('{% hi');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('hi');
    expect(ctx!.isClosing).toBe(false);
  });

  it('detects complete tag name with trailing space', () => {
    const ctx = getTagContext('{% hint ');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('hint');
    expect(ctx!.isClosing).toBe(false);
  });

  it('detects empty tag opener', () => {
    const ctx = getTagContext('{% ');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('');
    expect(ctx!.isClosing).toBe(false);
  });

  it('detects closing tag', () => {
    const ctx = getTagContext('{% /hin');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('hin');
    expect(ctx!.isClosing).toBe(true);
  });

  it('detects closing tag with space', () => {
    const ctx = getTagContext('{% / ');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('');
    expect(ctx!.isClosing).toBe(true);
  });

  it('detects attribute name being typed', () => {
    const ctx = getTagContext('{% hint ty');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('hint');
    expect(ctx!.attribute).toBeDefined();
    expect(ctx!.attribute!.name).toBe('ty');
    expect(ctx!.attribute!.inValue).toBe(false);
  });

  it('detects attribute value being typed', () => {
    const ctx = getTagContext('{% hint type="no');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('hint');
    expect(ctx!.attribute).toBeDefined();
    expect(ctx!.attribute!.name).toBe('type');
    expect(ctx!.attribute!.inValue).toBe(true);
    expect(ctx!.attribute!.valuePrefix).toBe('no');
  });

  it('detects cursor after equals sign', () => {
    const ctx = getTagContext('{% hint type=');
    expect(ctx).toBeDefined();
    expect(ctx!.attribute!.name).toBe('type');
    expect(ctx!.attribute!.inValue).toBe(true);
    expect(ctx!.attribute!.valuePrefix).toBe('');
  });

  it('tracks existing attributes', () => {
    const ctx = getTagContext('{% grid cols="3" ');
    expect(ctx).toBeDefined();
    expect(ctx!.existingAttributes).toContain('cols');
  });

  it('handles tags with hyphenated names', () => {
    const ctx = getTagContext('{% music-play');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('music-play');
  });

  it('works after a complete preceding tag', () => {
    const ctx = getTagContext('{% hint type="note" %}\nSome text\n{% ');
    expect(ctx).toBeDefined();
    expect(ctx!.tagName).toBe('');
  });
});

describe('findUnclosedTags', () => {
  it('returns empty for no tags', () => {
    expect(findUnclosedTags('Hello world')).toEqual([]);
  });

  it('finds single unclosed tag', () => {
    expect(findUnclosedTags('{% hint type="note" %}')).toEqual(['hint']);
  });

  it('ignores self-closing tags', () => {
    expect(findUnclosedTags('{% toc /%}')).toEqual([]);
  });

  it('ignores matched pairs', () => {
    expect(findUnclosedTags('{% hint type="note" %}text{% /hint %}')).toEqual([]);
  });

  it('finds nested unclosed tags', () => {
    const text = '{% tabs %}{% tab name="A" %}';
    expect(findUnclosedTags(text)).toEqual(['tabs', 'tab']);
  });

  it('handles partially closed nesting', () => {
    const text = '{% tabs %}{% tab name="A" %}content{% /tab %}';
    expect(findUnclosedTags(text)).toEqual(['tabs']);
  });
});
