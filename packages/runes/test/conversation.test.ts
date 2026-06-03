import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

describe('conversation tag', () => {
  it('should create a Conversation component from blockquotes', () => {
    const result = parse(`{% conversation %}
> Hello there!

> Hi! How can I help?
{% /conversation %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'conversation');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('div');
  });

  it('should create ConversationMessage children from blockquotes', () => {
    const result = parse(`{% conversation %}
> First message

> Second message

> Third message
{% /conversation %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'conversation');
    const messages = findAllTags(tag!, t => t.attributes['data-rune'] === 'conversation-message');
    expect(messages.length).toBe(3);
  });

  it('should alternate alignment left and right', () => {
    const result = parse(`{% conversation %}
> First message

> Second message
{% /conversation %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'conversation');
    const messages = findAllTags(tag!, t => t.attributes['data-rune'] === 'conversation-message');

    const alignments = messages.map(msg => fields(msg).align);
    expect(alignments[0]).toBe('left');
    expect(alignments[1]).toBe('right');
  });

  it('injects a bold name prefix into the bubble when speakers attribute is used', () => {
    const result = parse(`{% conversation speakers="Alice,Bob" %}
> Hello there!

> Hi! How can I help?
{% /conversation %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'conversation');
    const messages = findAllTags(tag!, t => t.attributes['data-rune'] === 'conversation-message');
    expect(messages.length).toBe(2);

    // First message's body should start with <strong>Alice:</strong> then a space then the message.
    const firstStrong = findTag(messages[0], t => t.name === 'strong');
    expect(firstStrong).toBeDefined();
    expect(JSON.stringify(firstStrong)).toContain('Alice:');

    const secondStrong = findTag(messages[1], t => t.name === 'strong');
    expect(secondStrong).toBeDefined();
    expect(JSON.stringify(secondStrong)).toContain('Bob:');
  });

  it('does not duplicate the prefix when the explicit `**Name**:` form is used', () => {
    const result = parse(`{% conversation speakers="Alice,Bob" %}
> **Carol**: Hello there!
{% /conversation %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'conversation');
    const messages = findAllTags(tag!, t => t.attributes['data-rune'] === 'conversation-message');
    expect(messages.length).toBe(1);

    // Explicit `**Carol**:` wins — speaker should be Carol, not Alice from the speakers list.
    // The body keeps the author's strong tag and no second strong is injected.
    const strongs = findAllTags(messages[0], t => t.name === 'strong');
    expect(strongs.length).toBe(1);
    expect(JSON.stringify(strongs[0])).toContain('Carol');
    expect(JSON.stringify(strongs[0])).not.toContain('Alice');
  });
});
