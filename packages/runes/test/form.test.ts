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

describe('form field structural output', () => {
  it('should generate label and input for a text field', () => {
    const result = parse(`{% form action="/submit" %}
- Name
{% /form %}`);

    const field = findTag(result as any, t => t.attributes.typeof === 'FormField');
    expect(field).toBeDefined();

    const label = findTag(field!, t => t.name === 'label');
    expect(label).toBeDefined();
    expect(label!.children).toContain('Name');

    const input = findTag(field!, t => t.name === 'input');
    expect(input).toBeDefined();
    expect(input!.attributes.type).toBe('text');
    expect(input!.attributes.id).toBe('field-name');
  });

  it('should infer email type from field name', () => {
    const result = parse(`{% form action="/submit" %}
- Email
{% /form %}`);

    const field = findTag(result as any, t => t.attributes.typeof === 'FormField');
    const input = findTag(field!, t => t.name === 'input');
    expect(input).toBeDefined();
    expect(input!.attributes.type).toBe('email');
  });

  it('should generate textarea for message fields', () => {
    const result = parse(`{% form action="/submit" %}
- Comments
{% /form %}`);

    const field = findTag(result as any, t => t.attributes.typeof === 'FormField');
    const textarea = findTag(field!, t => t.name === 'textarea');
    expect(textarea).toBeDefined();
    expect(textarea!.attributes.rows).toBe('4');
  });

  it('should add required asterisk span', () => {
    const result = parse(`{% form action="/submit" %}
- Name
{% /form %}`);

    const field = findTag(result as any, t => t.attributes.typeof === 'FormField');
    const requiredSpan = findTag(field!, t =>
      t.name === 'span' && t.attributes['data-name'] === 'required'
    );
    expect(requiredSpan).toBeDefined();
    expect(requiredSpan!.children).toContain('*');
  });

  it('should omit required asterisk for optional fields', () => {
    const result = parse(`{% form action="/submit" %}
- Name (optional)
{% /form %}`);

    const field = findTag(result as any, t => t.attributes.typeof === 'FormField');
    const requiredSpan = findTag(field!, t =>
      t.name === 'span' && t.attributes['data-name'] === 'required'
    );
    expect(requiredSpan).toBeUndefined();
  });

  it('should pass placeholder to input', () => {
    const result = parse(`{% form action="/submit" %}
- Email (placeholder: 'you@example.com')
{% /form %}`);

    const field = findTag(result as any, t => t.attributes.typeof === 'FormField');
    const input = findTag(field!, t => t.name === 'input');
    expect(input).toBeDefined();
    expect(input!.attributes.placeholder).toBe('you@example.com');
  });

  it('should include fieldType meta for engine consumption', () => {
    const result = parse(`{% form action="/submit" %}
- Email
{% /form %}`);

    const field = findTag(result as any, t => t.attributes.typeof === 'FormField');
    const meta = findTag(field!, t =>
      t.name === 'meta' && t.attributes.property === 'fieldType'
    );
    expect(meta).toBeDefined();
    expect(meta!.attributes.content).toBe('email');
  });
});

describe('form special types', () => {
  it('should generate submit button from bold paragraph', () => {
    const result = parse(`{% form action="/submit" %}
- Name

**Send**
{% /form %}`);

    const form = findTag(result as any, t => t.attributes.typeof === 'Form');
    const button = findTag(form!, t => t.name === 'button');
    expect(button).toBeDefined();
    expect(button!.attributes.type).toBe('submit');
    expect(button!.attributes['data-name']).toBe('submit');
    expect(button!.children).toContain('Send');
  });

  it('should generate separator from horizontal rule', () => {
    const result = parse(`{% form action="/submit" %}
- Name
---
- Email
{% /form %}`);

    const form = findTag(result as any, t => t.attributes.typeof === 'Form');
    const hr = findTag(form!, t =>
      t.name === 'hr' && t.attributes['data-name'] === 'separator'
    );
    expect(hr).toBeDefined();
  });

  it('should generate help text from standalone blockquote', () => {
    const result = parse(`{% form action="/submit" %}
- Name

> We will never share your data
{% /form %}`);

    const form = findTag(result as any, t => t.attributes.typeof === 'Form');
    const help = findTag(form!, t =>
      t.name === 'p' && t.attributes['data-name'] === 'help'
    );
    expect(help).toBeDefined();
    expect(help!.children).toContain('We will never share your data');
  });

  it('should generate description from paragraph', () => {
    const result = parse(`{% form action="/submit" %}
Fill out the form below.

- Name
{% /form %}`);

    const form = findTag(result as any, t => t.attributes.typeof === 'Form');
    const desc = findTag(form!, t =>
      t.name === 'p' && t.attributes['data-name'] === 'text'
    );
    expect(desc).toBeDefined();
  });

  it('should generate fieldset group from heading', () => {
    const result = parse(`{% form action="/submit" %}
## Contact Info
- Name
- Email
{% /form %}`);

    const form = findTag(result as any, t => t.attributes.typeof === 'Form');
    const fieldset = findTag(form!, t =>
      t.name === 'fieldset' && t.attributes.class === 'rf-form-fieldset'
    );
    expect(fieldset).toBeDefined();
    const legend = findTag(fieldset!, t => t.name === 'legend');
    expect(legend).toBeDefined();
    expect(legend!.children).toContain('Contact Info');
  });
});

describe('form choice groups', () => {
  it('should generate radio fieldset from blockquote + short list', () => {
    const result = parse(`{% form action="/submit" %}
> Preferred contact
- Phone
- Email
- Mail
{% /form %}`);

    const form = findTag(result as any, t => t.attributes.typeof === 'Form');
    const fieldset = findTag(form!, t =>
      t.name === 'fieldset' && t.attributes.typeof === 'FormField'
    );
    expect(fieldset).toBeDefined();

    const inputs = findAllTags(fieldset!, t =>
      t.name === 'input' && t.attributes.type === 'radio'
    );
    expect(inputs.length).toBe(3);
  });

  it('should generate checkbox fieldset for multiple selection', () => {
    const result = parse(`{% form action="/submit" %}
> Interests (multiple)
- Sports
- Music
- Art
{% /form %}`);

    const form = findTag(result as any, t => t.attributes.typeof === 'Form');
    const fieldset = findTag(form!, t =>
      t.name === 'fieldset' && t.attributes.typeof === 'FormField'
    );
    expect(fieldset).toBeDefined();

    const inputs = findAllTags(fieldset!, t =>
      t.name === 'input' && t.attributes.type === 'checkbox'
    );
    expect(inputs.length).toBe(3);
  });

  it('should generate select for long option lists', () => {
    const result = parse(`{% form action="/submit" %}
> Country
- USA
- UK
- Canada
- Australia
- Germany
{% /form %}`);

    const form = findTag(result as any, t => t.attributes.typeof === 'Form');
    const field = findTag(form!, t => t.attributes.typeof === 'FormField');
    const select = findTag(field!, t => t.name === 'select');
    expect(select).toBeDefined();

    const options = findAllTags(select!, t => t.name === 'option');
    // 5 options + 1 default "Select an option"
    expect(options.length).toBe(6);
  });
});
