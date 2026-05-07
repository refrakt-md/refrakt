import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('storyboard tag', () => {
  it('should create a Storyboard component', () => {
    const result = parse(`{% storyboard %}
![Panel 1](/img/panel1.png)

Caption for panel 1.

![Panel 2](/img/panel2.png)

Caption for panel 2.
{% /storyboard %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'storyboard');
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('div');
  });

  it('should create StoryboardPanel children from images', () => {
    const result = parse(`{% storyboard %}
![Panel 1](/img/panel1.png)

First panel caption.

![Panel 2](/img/panel2.png)

Second panel caption.
{% /storyboard %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'storyboard');
    const panels = findAllTags(tag!, t => t.attributes['data-rune'] === 'storyboard-panel');
    expect(panels.length).toBe(2);
  });

  it('should pass variant attribute as meta', () => {
    const result = parse(`{% storyboard variant="comic" %}
![Panel](/img/panel.png)

Caption.
{% /storyboard %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'storyboard');
    const variantMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === 'comic');
    expect(variantMeta).toBeDefined();
  });

  it('should work with the comic alias', () => {
    const result = parse(`{% comic %}
![Panel](/img/panel.png)

Caption.
{% /comic %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'storyboard');
    expect(tag).toBeDefined();
  });

  it('should pass columns attribute as meta', () => {
    const result = parse(`{% storyboard columns=2 %}
![Panel](/img/panel.png)

Caption.
{% /storyboard %}`);

    const tag = findTag(result as any, t => t.attributes['data-rune'] === 'storyboard');
    const columnsMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.content === '2');
    expect(columnsMeta).toBeDefined();
  });
});
