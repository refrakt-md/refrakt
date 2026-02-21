import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('form tag', () => {
  it('should create a Form component', () => {
    const result = parse(`{% form action="/submit" %}
- Name
- Email
{% /form %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Form');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('form');
  });

  it('should pass action and method attributes as meta', () => {
    const result = parse(`{% form action="/api/contact" method="POST" %}
- Name
{% /form %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Form');
    expect(tag).toBeDefined();

    const actionMeta = findTag(tag!, t =>
      t.name === 'meta' && t.attributes.content === '/api/contact'
    );
    expect(actionMeta).toBeDefined();
  });

  it('should create FormField children from list items', () => {
    const result = parse(`{% form action="/submit" %}
- Name
- Email
- Message
{% /form %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Form');
    const fields = findAllTags(tag!, t => t.attributes.typeof === 'FormField');
    expect(fields.length).toBeGreaterThanOrEqual(3);
  });

  it('should pass style attribute as meta', () => {
    const result = parse(`{% form action="/submit" style="inline" %}
- Name
{% /form %}`);

    const tag = findTag(result as any, t => t.attributes.typeof === 'Form');
    const styleMeta = findTag(tag!, t =>
      t.name === 'meta' && t.attributes.content === 'inline'
    );
    expect(styleMeta).toBeDefined();
  });
});
