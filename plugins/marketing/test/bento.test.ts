import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags, fields } from './helpers.js';

const bentoOf = (src: string) => {
  const result = parse(src);
  return findTag(result as any, t => t.attributes['data-rune'] === 'bento');
};
const cellsOf = (tag: any) => findAllTags(tag, (t: any) => t.attributes['data-rune'] === 'bento-cell');

describe('bento tag', () => {
  it('renders as a section (grid primitive, not a page section)', () => {
    const tag = bentoOf(`{% bento %}
## A

content
{% /bento %}`);
    expect(tag).toBeDefined();
    expect(tag!.name).toBe('section');
    expect(findTag(tag!, t => t.attributes?.['data-name'] === 'headline')).toBeUndefined();
    expect(findTag(tag!, t => t.attributes?.['data-name'] === 'eyebrow')).toBeUndefined();
  });

  it('every heading becomes a cell; size comes from heading depth', () => {
    const tag = bentoOf(`{% bento %}
## Large

L.

### Medium

M.

#### Small

S.
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(cells.length).toBe(3);
    expect(fields(cells[0]).size).toBe('large');
    expect(fields(cells[1]).size).toBe('medium');
    expect(fields(cells[2]).size).toBe('small');
  });

  it('the cell title is a uniform-level heading (h3) carrying data-name=title', () => {
    const tag = bentoOf(`{% bento %}
## My Tile

Body text.
{% /bento %}`);
    const cell = cellsOf(tag!)[0];
    const title = findTag(cell, t => t.attributes?.['data-name'] === 'title');
    expect(title).toBeDefined();
    expect(title!.name).toBe('h3');
    expect(JSON.stringify(title)).toContain('My Tile');
  });

  it('size presets resolve to proportional cols/rows on the default 6-col grid', () => {
    const tag = bentoOf(`{% bento %}
## Large

L.

### Medium

M.

#### Small

S.
{% /bento %}`);
    const cells = cellsOf(tag!);
    // large = ⅔×2, medium = ½, small = ⅓  →  4/3/2 @ 6 cols
    expect(fields(cells[0]).cols).toBe('4');
    expect(fields(cells[0]).rows).toBe('2');
    expect(fields(cells[1]).cols).toBe('3');
    expect(fields(cells[2]).cols).toBe('2');
  });

  it('presets stay proportional at a non-default column count', () => {
    const tag = bentoOf(`{% bento columns=12 %}
## Large

L.
{% /bento %}`);
    expect(fields(cellsOf(tag!)[0]).cols).toBe('8'); // ⅔ of 12
  });

  it('cell content lands in a data-name=body zone', () => {
    const tag = bentoOf(`{% bento %}
## T

Hello body.
{% /bento %}`);
    const body = findTag(cellsOf(tag!)[0], t => t.attributes?.['data-name'] === 'body');
    expect(body).toBeDefined();
    expect(JSON.stringify(body)).toContain('Hello body');
  });

  it('a `---` in a cell creates a media zone (data-section=media)', () => {
    const tag = bentoOf(`{% bento %}
## Tile

![pic](https://example.com/x.png)

---

Caption.
{% /bento %}`);
    const media = findTag(cellsOf(tag!)[0], t => t.attributes?.['data-section'] === 'media');
    expect(media).toBeDefined();
    expect(findTag(media!, t => t.name === 'img')).toBeDefined();
  });

  it('media-position default is size-derived (small → top, large → start)', () => {
    const tag = bentoOf(`{% bento %}
## Large

L.

#### Small

S.
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(cells[0].attributes['data-media-position']).toBe('start'); // large
    expect(cells[1].attributes['data-media-position']).toBe('top');   // small
  });

  it('a trailing `---` zone becomes a footer', () => {
    const tag = bentoOf(`{% bento %}
## T

![m](https://example.com/m.png)

---

main body

---

footer meta
{% /bento %}`);
    expect(findTag(cellsOf(tag!)[0], t => t.name === 'footer' && t.attributes?.['data-name'] === 'footer')).toBeDefined();
  });

  it('the grid carries the columns + collapse contract', () => {
    const tag = bentoOf(`{% bento columns=6 collapse="lg" %}
## A

x
{% /bento %}`);
    expect(fields(tag).columns).toBe('6');
    expect(fields(tag).collapse).toBe('lg');
  });

  it("explicit {% bento-cell %} cells short-circuit heading conversion (cols/rows/href/media-position)", () => {
    const tag = bentoOf(`{% bento columns=6 %}
{% bento-cell cols=3 rows=2 media-position="end" href="/x" %}
## Explicit

Body.
{% /bento-cell %}
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(cells.length).toBe(1);
    const c = cells[0];
    expect(fields(c).cols).toBe("3");
    expect(fields(c).rows).toBe("2");
    expect(c.attributes["data-media-position"]).toBe("end");
    expect(findTag(c, t => t.name === "a" && t.attributes?.["data-name"] === "link")).toBeDefined();
    expect(findTag(c, t => t.attributes?.["data-name"] === "title")?.name).toBe("h3");
  });

  it("explicit mode wins: headings alongside explicit cells are ignored", () => {
    const tag = bentoOf(`{% bento %}
## Ignored Heading

loose text

{% bento-cell size="small" %}
## Real

x
{% /bento-cell %}
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(cells.length).toBe(1);
    expect(JSON.stringify(cells[0])).toContain("Real");
    expect(JSON.stringify(cells[0])).not.toContain("Ignored Heading");
  });

  it("grid-level content-height + media-ratio land on the bento contract", () => {
    const tag = bentoOf(`{% bento content-height="md" media-ratio="1/3" %}
## A

x
{% /bento %}`);
    expect(fields(tag)["content-height"]).toBe("md");
    expect(fields(tag)["media-ratio"]).toBe("1/3");
  });

  it("per-cell content-height / media-ratio override the grid default", () => {
    const tag = bentoOf(`{% bento content-height="sm" %}
{% bento-cell content-height="lg" media-ratio="1/2" %}
## Cell

body
{% /bento-cell %}
{% /bento %}`);
    const cell = cellsOf(tag!)[0];
    expect(fields(cell)["content-height"]).toBe("lg");
    expect(fields(cell)["media-ratio"]).toBe("1/2");
    expect(fields(tag)["content-height"]).toBe("sm"); // grid keeps its own default
  });

  it("unset content-height / media-ratio are empty (cell inherits the grid/theme default)", () => {
    const tag = bentoOf(`{% bento %}
## A

x
{% /bento %}`);
    expect(fields(tag)["content-height"]).toBe("");
    expect(fields(tag)["media-ratio"]).toBe("");
    expect(fields(cellsOf(tag!)[0])["media-ratio"]).toBe("");
  });
});
