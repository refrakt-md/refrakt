import { describe, it, expect, vi } from 'vitest';
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

  it('every heading becomes a cell; size comes from absolute heading level', () => {
    const tag = bentoOf(`{% bento %}
# Full

F.

## Large

L.

### Medium

M.

#### Small

S.
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(cells.length).toBe(4);
    expect(fields(cells[0]).size).toBe('full');
    expect(fields(cells[1]).size).toBe('large');
    expect(fields(cells[2]).size).toBe('medium');
    expect(fields(cells[3]).size).toBe('small');
  });

  it('size is absolute: a grid of only h3 cells gets medium (not large via auto-detect)', () => {
    const tag = bentoOf(`{% bento %}
### Only

x

### Two

y
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(fields(cells[0]).size).toBe('medium');
    expect(fields(cells[0]).cols).toBe('3');
    expect(fields(cells[0]).rows).toBe('1');
    expect(fields(cells[1]).size).toBe('medium');
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

  it('levels: a width-only ladder ("6,5,4,3,2,1") sets cols by heading level, rows=1 (revives span mode)', () => {
    const tag = bentoOf(`{% bento levels="6,5,4,3,2,1" %}
# A

a

## B

b

### C

c
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(fields(cells[0]).cols).toBe('6'); // h1 = rung 0
    expect(fields(cells[0]).rows).toBe('1');
    expect(fields(cells[1]).cols).toBe('5'); // h2 = rung 1
    expect(fields(cells[2]).cols).toBe('4'); // h3 = rung 2
    expect(fields(cells[2]).rows).toBe('1');
  });

  it('levels: a "WxH" rung sets both cols and rows (varied-height feed)', () => {
    const tag = bentoOf(`{% bento levels="6x1,6x2,6x3" %}
# A

a

## B

b

### C

c
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(fields(cells[0]).rows).toBe('1'); // h1 = rung 0
    expect(fields(cells[1]).rows).toBe('2'); // h2 = rung 1
    expect(fields(cells[2]).cols).toBe('6'); // h3 = rung 2
    expect(fields(cells[2]).rows).toBe('3');
  });

  it('levels: heading levels beyond the ladder clamp to the last rung', () => {
    const tag = bentoOf(`{% bento levels="6,3" %}
# A

a

## B

b

### C

c

#### D

d
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(fields(cells[0]).cols).toBe('6'); // h1 = rung 0
    expect(fields(cells[1]).cols).toBe('3'); // h2 = rung 1
    expect(fields(cells[2]).cols).toBe('3'); // h3 clamps to last
    expect(fields(cells[3]).cols).toBe('3'); // h4 clamps to last
  });

  it('levels: rung index is absolute to heading level (not relative to the shallowest heading in the grid)', () => {
    const tag = bentoOf(`{% bento levels="6,3,2" %}
### A

a

#### B

b
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(fields(cells[0]).cols).toBe('2'); // h3 = rung 2, not "shallowest = rung 0"
    expect(fields(cells[1]).cols).toBe('2'); // h4 clamps to last (rung 2)
  });

  it('levels: ladder cells carry a neutral size so size-based collapse never clobbers them', () => {
    const tag = bentoOf(`{% bento levels="6,3,2" %}
## A

a
{% /bento %}`);
    const cell = cellsOf(tag!)[0];
    expect(fields(cell).size).toBe('');
    expect(cell.attributes['data-media-position']).toBe('top'); // neutral size → top, not start
  });

  it('levels: explicit {% bento-cell %} grids ignore the ladder (cells keep their own spans)', () => {
    const tag = bentoOf(`{% bento levels="6,5,4" %}
{% bento-cell cols=2 rows=1 %}
## Explicit

x
{% /bento-cell %}
{% /bento %}`);
    const cell = cellsOf(tag!)[0];
    expect(fields(cell).cols).toBe('2'); // the cell's own cols, not ladder rung 0 (6)
    expect(fields(cell).rows).toBe('1');
  });

  it('levels: a malformed rung warns and is skipped; valid rungs still apply', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tag = bentoOf(`{% bento levels="6,oops,2" %}
# A

a

## B

b
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(fields(cells[0]).cols).toBe('6'); // h1 = rung 0
    expect(fields(cells[1]).cols).toBe('2'); // "oops" dropped → rung 1 is "2"
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('oops'));
    warn.mockRestore();
  });

  it('omitting levels leaves tiered sizing unchanged', () => {
    const tag = bentoOf(`{% bento %}
## A

a

### B

b
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(fields(cells[0]).size).toBe('large');
    expect(fields(cells[0]).cols).toBe('4');
    expect(fields(cells[1]).size).toBe('medium');
  });

  it('grid-level media-position is the default for every cell, overriding the size-derived one', () => {
    const tag = bentoOf(`{% bento media-position="top" %}
## Large

L.

#### Small

S.
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(cells[0].attributes['data-media-position']).toBe('top'); // large would be 'start' by default
    expect(cells[1].attributes['data-media-position']).toBe('top');
  });

  it('a cell\'s own media-position still wins over the grid default (explicit cells)', () => {
    const tag = bentoOf(`{% bento media-position="top" %}
{% bento-cell size="large" %}
## A

a
{% /bento-cell %}

{% bento-cell size="large" media-position="end" %}
## B

b
{% /bento-cell %}
{% /bento %}`);
    const cells = cellsOf(tag!);
    expect(cells[0].attributes['data-media-position']).toBe('top'); // inherits grid default
    expect(cells[1].attributes['data-media-position']).toBe('end'); // own value wins
  });

  it('without a grid media-position, the size-derived default is unchanged', () => {
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
