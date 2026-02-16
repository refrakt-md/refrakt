import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('conversation tag', () => {
  it('should create a Conversation component from blockquotes', () => {
    const result = parse(`{% conversation %}
> Hello there!

> Hi! How can I help?
{% /conversation %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Conversation');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('div');
  });

  it('should create ConversationMessage children from blockquotes', () => {
    const result = parse(`{% conversation %}
> First message

> Second message

> Third message
{% /conversation %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Conversation');
    const messages = findAllTags(tag!, t => t.attributes.typeof === 'ConversationMessage');
    expect(messages.length).toBe(3);
  });

  it('should alternate alignment left and right', () => {
    const result = parse(`{% conversation %}
> First message

> Second message
{% /conversation %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Conversation');
    const messages = findAllTags(tag!, t => t.attributes.typeof === 'ConversationMessage');

    const alignments = messages.map(msg =>
      findTag(msg, t => t.name === 'meta')?.attributes.content
    );
    expect(alignments[0]).toBe('left');
    expect(alignments[1]).toBe('right');
  });
});
