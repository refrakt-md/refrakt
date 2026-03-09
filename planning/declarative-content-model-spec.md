# Declarative Content Model — Specification

> **Status:** Design proposal
> **Scope:** Schema-driven content parsing that replaces per-rune `processChildren` methods
> **Related:** Alignment Specification, Media Runes Specification, Layout Specification

---

## Problem

Every rune with structured content has a hand-coded `processChildren` method that walks AST children, checks types, and assigns meaning through sequential scanning. The hero identifies eyebrows, headlines, and blurbs. The recipe identifies ingredients, steps, and tips. The character splits content into named sections. The grid splits content by `hr` delimiters.

These methods all do roughly the same thing — match children by type in a specific order — but each one is written from scratch. This creates several problems:

1. **Duplicated logic.** Thirty-plus runes implement sequential AST scanning independently, each with its own edge cases and bugs.
2. **Editor blindness.** The editor can't suggest missing fields or insert content correctly because the parsing rules are buried in imperative code, not declarable data.
3. **Validation gaps.** Missing required content (a recipe without ingredients) is caught ad hoc or not at all.
4. **Community burden.** Package authors must write custom parsing code for every rune instead of declaring a content model and getting parsing for free.

---

## Design Principles

**One source of truth.** The content model is declared once in the schema. The transform resolver, the editor, the inspector, and the validation system all read the same declaration. No drift between parsing logic and editor behaviour.

**Declarative over imperative.** Runes declare what their content structure looks like. A generic resolver engine handles the matching. No per-rune `processChildren` methods.

**Three structural patterns cover almost everything.** Sequential matching, section splitting, and delimiter splitting handle every content model across all runes. These compose for runes with nested structure. A fourth `custom` pattern exists as an explicit escape hatch for the rare runes (~2 out of 30+) whose content parsing is genuinely stateful.

**Inline extraction without custom parsers.** List item fields are extracted by matching on AST inline node types (bold, italic, link) and text patterns (regex on remaining text). Markdoc already parses inline formatting — the resolver reads what's already there.

---

## Structural Patterns

The content model resolver handles three declarative patterns for block-level content, plus a custom escape hatch. Each pattern describes how a rune's AST children are grouped and assigned to named fields.

### Pattern 1: Sequence

Children are matched in order by node type. Each field consumes the next child that matches its type. Optional fields are skipped if the next child doesn't match.

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'eyebrow', match: 'paragraph', optional: true },
    { name: 'headline', match: 'heading', optional: false },
    { name: 'blurb', match: 'paragraph', optional: true },
    { name: 'actions', match: 'list', optional: true },
  ],
}
```

Given children `[paragraph, h1, paragraph, ul]`, the resolver assigns: eyebrow → paragraph, headline → h1, blurb → paragraph, actions → ul.

Given children `[h1, paragraph]` (no eyebrow), the resolver skips eyebrow (optional, next child is a heading not a paragraph), assigns: headline → h1, blurb → paragraph.

### Pattern 2: Sections

Children are split into named groups by heading elements. The heading text becomes the section name. Everything between headings belongs to that section.

```typescript
contentModel: {
  type: 'sections',
  sectionHeading: 'heading:2',
  fields: [
    { name: 'preamble', match: 'any', optional: true, greedy: true, beforeSections: true },
  ],
  sectionModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

Given:
```markdoc
Some introductory text.

## Appearance
Tall and gaunt. White hair in long braids.

## Personality
Calm, deliberate, and patient.
```

The resolver produces: preamble → [intro paragraph], sections → { "Appearance": [paragraph], "Personality": [paragraph] }.

The `fields` array with `beforeSections: true` captures content before the first section heading. These preamble fields are resolved via `resolveSequence` on the pre-heading children. At most one field group per sections model should use `beforeSections`.

#### Heading level auto-detection

When `sectionHeading` is `'heading'` (no level suffix), the level is auto-detected from the first heading child. This matches the behaviour of the `headingsToList()` utility used by 11+ runes today, where authors can use any heading level and the rune adapts.

#### Heading extraction (`headingExtract`)

Several runes parse structured data from heading text. Timeline parses `"2023 — Company founded"` into date and label. Itinerary parses `"9:00 AM — Narita Airport"` into time and location. Budget detects `(estimate)` suffixes.

The optional `headingExtract` property applies the same text-pattern matching used in `itemModel` to each section's heading text:

```typescript
contentModel: {
  type: 'sections',
  sectionHeading: 'heading',
  headingExtract: {
    fields: [
      { name: 'date', match: 'text', pattern: /^(.+?)\s*[-–—:]\s*/, optional: true },
      { name: 'label', match: 'text', pattern: 'remainder', optional: false },
    ],
  },
  sectionModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

Each section in the output gains the extracted fields alongside its resolved body. The raw heading text is always available as `$heading` regardless of whether extraction fields match.

#### Section-to-tag emission (`emitTag`)

Most runes that use heading-based sections don't produce a dictionary of named groups — they produce an ordered list of child rune tag nodes. Accordion headings become `accordion-item` tags. Timeline headings become `timeline-entry` tags. This is the pattern used by 11 runes today via the `headingsToList()` utility.

The `emitTag` and `emitAttributes` properties make sections emit child rune tag AST nodes instead of dictionary entries:

```typescript
// Accordion: headings become accordion-item tags
contentModel: {
  type: 'sections',
  sectionHeading: 'heading',
  emitTag: 'accordion-item',
  emitAttributes: { name: '$heading' },
  sectionModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

`$heading` refers to the raw heading text. When `headingExtract` is also present, `$fieldName` refers to extracted fields:

```typescript
// Timeline: heading text parsed into date + label, emitted as timeline-entry attributes
contentModel: {
  type: 'sections',
  sectionHeading: 'heading',
  headingExtract: {
    fields: [
      { name: 'date', match: 'text', pattern: /^(.+?)\s*[-–—:]\s*/, optional: true },
      { name: 'label', match: 'text', pattern: 'remainder', optional: false },
    ],
  },
  emitTag: 'timeline-entry',
  emitAttributes: { date: '$date', label: '$label' },
  sectionModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

When `emitTag` is set, the resolver replaces `headingsToList()` + manual `Ast.Node('tag', ...)` construction. The emitted tag nodes are then processed by the `@group` decorator system or the content model's parent, just as `processChildren` returns them today.

#### Multi-level section nesting

The `sectionModel` of a `sections` pattern can itself be a `sections` pattern, enabling recursive nesting. No new properties needed — the composition is natural.

Symbol has 3-level nesting (h3 → group, h4 → member). Itinerary has 2-level nesting (h2 → day, h3 → stop):

```typescript
// Itinerary: h2 → day, h3 → stop within each day
contentModel: {
  type: 'sections',
  sectionHeading: 'heading:2',
  emitTag: 'itinerary-day',
  emitAttributes: { label: '$heading' },
  sectionModel: {
    type: 'sections',
    sectionHeading: 'heading:3',
    headingExtract: {
      fields: [
        { name: 'time', match: 'text', pattern: /^(.+?)\s*[-–—]\s*/, optional: true },
        { name: 'location', match: 'text', pattern: 'remainder', optional: false },
      ],
    },
    emitTag: 'itinerary-stop',
    emitAttributes: { time: '$time', location: '$location' },
    sectionModel: {
      type: 'sequence',
      fields: [
        { name: 'body', match: 'any', optional: true, greedy: true },
      ],
    },
  },
}
```

### Pattern 3: Delimited

Children are split into groups by a delimiter node (typically `hr`). Each group maps to a named zone.

```typescript
contentModel: {
  type: 'delimited',
  delimiter: 'hr',
  zones: [
    {
      name: 'content',
      type: 'sequence',
      fields: [
        { name: 'eyebrow', match: 'paragraph', optional: true },
        { name: 'headline', match: 'heading', optional: false },
        { name: 'blurb', match: 'paragraph', optional: true },
        { name: 'actions', match: 'list', optional: true },
      ],
    },
    {
      name: 'media',
      type: 'sequence',
      fields: [
        { name: 'media', match: 'any', optional: true, greedy: true },
      ],
    },
  ],
}
```

Given:
```markdoc
Short eyebrow text.

# Welcome to the Platform

Build something amazing.

- [Get Started](/start)

---

![Hero image](/images/hero.png)
```

The resolver splits at `---`: content zone gets the pre-delimiter children (resolved via its sequence model), media zone gets the post-delimiter children.

### Pattern 4: Custom

An explicit escape hatch for runes whose content parsing is genuinely stateful and cannot be expressed declaratively. Only 2 out of 30+ runes need this: `form` (multi-pass state machine with lookahead) and `conversation` (alternating speaker alignment tracking).

```typescript
contentModel: {
  type: 'custom',
  processChildren: (nodes: Node[], attributes: Record<string, any>) => Node[],
  description: 'Multi-pass form field parser with type inference and selection detection',
}
```

The `processChildren` function receives AST children and the rune's attribute values, returns rewritten nodes. This is the same signature as the current `processChildren` method on Model subclasses.

The `description` field documents what the custom parser does, enabling the editor to show a textual summary. For `custom` runes, the editor degrades gracefully: no field presence display, no insertion suggestions, but the rune still renders normally.

**When to use `custom`:** Only when the parsing logic requires lookahead across siblings, backward scanning, mutable state accumulation between iterations, or conditional type inference from content. If a rune's content parsing can be expressed as "split by X, then match fields in order", use a declarative pattern instead.

### Conditional Content Models (`when`)

Some runes change their content parsing based on attributes or content shape. Symbol branches on its `kind` attribute (grouped members vs flat body). Itinerary branches on whether h2 headings are present (day grouping vs flat stops).

The `when` property selects between content models:

```typescript
contentModel: {
  when: [
    {
      condition: { attribute: 'kind', in: ['class', 'interface', 'module'] },
      model: {
        type: 'sections',
        sectionHeading: 'heading:3',
        emitTag: 'symbol-group',
        emitAttributes: {},
        sectionModel: { /* nested heading:4 sections for members */ },
      },
    },
  ],
  default: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

Condition types (exhaustive — no arbitrary expressions):

| Condition | Description |
|---|---|
| `{ attribute: string, in: string[] }` | Branch on attribute value |
| `{ attribute: string, exists: true }` | Branch on attribute presence |
| `{ hasChild: string }` | Branch on presence of a child matching a node type |

The resolver evaluates conditions in order and uses the first matching model. If no condition matches, the `default` model is used.

**Note:** Character and Realm do NOT need `when`. Their branching is in `transform()` output (sections vs body rendering), not in content parsing. The content model always produces sections; the transform checks whether any were found.

### Composing Patterns

Patterns nest. A feature rune is `delimited` at the top level, with a `sequence` model for each zone. A character rune is a `sequence` with a `sections` field inside it. Any combination is valid:

```typescript
// Feature: delimited → sequence per zone
contentModel: {
  type: 'delimited',
  delimiter: 'hr',
  zones: [
    { name: 'content', type: 'sequence', fields: [...] },
    { name: 'media', type: 'sequence', fields: [...] },
  ],
}

// Character: sequence with sections
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'portrait', match: 'image', optional: true },
    {
      name: 'sections',
      type: 'sections',
      sectionHeading: 'heading:2',
      sectionModel: {
        type: 'sequence',
        fields: [
          { name: 'body', match: 'any', optional: true, greedy: true },
        ],
      },
    },
  ],
}

// Grid: delimited into N equal zones
contentModel: {
  type: 'delimited',
  delimiter: 'hr',
  dynamicZones: true,  // number of zones determined by delimiter count
  zoneModel: {
    type: 'sequence',
    fields: [
      { name: 'content', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

---

## Field Properties

Each field in a content model has the following properties:

| Property | Type | Default | Description |
|---|---|---|---|
| `name` | string | — | Field name. Becomes the ref/property in the output. |
| `match` | string | — | Node type to match (see Match Types below). |
| `optional` | boolean | `false` | Whether the field can be absent without warning. |
| `greedy` | boolean | `false` | Consume all consecutive matching nodes into an array. |
| `template` | string | — | Markdoc snippet for editor insertion. |
| `description` | string | — | Human-readable description for editor UI. |
| `itemModel` | object | — | For list fields: declares how to extract structured data from each list item. |
| `parser` | string | — | Named parser for text pattern fields (see below). |
| `pattern` | RegExp \| `'remainder'` | — | For text-level extraction: regex pattern or 'remainder' for leftover text. |
| `beforeSections` | boolean | `false` | In a sections model: this field captures content before the first section heading. |

### Match Types

Block-level matches (used in `sequence`, `sections`, `delimited` models):

| Match value | Matches |
|---|---|
| `'paragraph'` | A paragraph node |
| `'heading'` | Any heading (h1–h6) |
| `'heading:2'` | Specifically an h2 |
| `'heading:3'` | Specifically an h3 |
| `'list'` | Ordered or unordered list |
| `'list:ordered'` | Only ordered lists |
| `'list:unordered'` | Only unordered lists |
| `'image'` | An image node |
| `'blockquote'` | A blockquote |
| `'fence'` | A fenced code block |
| `'hr'` | A horizontal rule |
| `'tag:track'` | A child rune tag of a specific type |
| `'tag:tint'` | A directive child rune (consumed, not rendered) |
| `'any'` | Any node type |

Inline-level matches (used in `itemModel` and `headingExtract` fields):

| Match value | Matches |
|---|---|
| `'strong'` | Bold text (`**text**`) |
| `'em'` | Italic text (`*text*`) |
| `'link'` | A link (`[text](url)`) |
| `'image'` | An inline image |
| `'code'` | Inline code (`` `text` ``) |
| `'text'` | Plain text content (used with `pattern`) |

---

## Inline Item Models

List items often contain structured data expressed through Markdown inline formatting. The `itemModel` property on a list field declares how to extract named fields from each list item's inline AST children.

### Item-Level Field Properties

In addition to the standard field properties, fields inside an `itemModel` support:

| Property | Type | Default | Description |
|---|---|---|---|
| `extract` | string | — | Which attribute to extract instead of text content (e.g., `'href'` on a link match). |

### Extraction Process

For each list item, the resolver:

1. Walks the item's inline children (already parsed by Markdoc into typed AST nodes)
2. For each inline child, checks if it matches a field's node type (`strong`, `em`, `link`, `image`, `code`)
3. If it matches, extracts the content — text content by default, or a specific attribute via `extract`
4. After all typed nodes are matched, collects remaining text nodes into a single string
5. Runs text `pattern` fields against the remaining text in declaration order, each consuming its match
6. A field with `pattern: 'remainder'` captures whatever text is left after all other patterns have matched

### Playlist Tracks

> **Note:** This example describes the target content format for the upcoming playlist/track rune redesign, which replaces the current pipe-delimited `trackFields` format with standard inline Markdown. The `cuePoints` nested model is a design target for the new implementation.

```typescript
{
  name: 'tracks',
  match: 'list',
  optional: false,
  itemModel: {
    fields: [
      { name: 'name', match: 'strong', optional: false,
        description: 'Track name in bold' },
      { name: 'src', match: 'link', optional: true, extract: 'href',
        description: 'Audio file URL from link' },
      { name: 'artist', match: 'em', optional: true,
        description: 'Artist name in italics' },
      { name: 'duration', match: 'text', optional: true,
        pattern: /\((\d+:\d+(?::\d+)?)\)/,
        description: 'Duration in parentheses: (5:55)' },
      { name: 'date', match: 'text', optional: true,
        pattern: /—\s*(.+)$/,
        description: 'Date after em-dash' },
      { name: 'description', match: 'paragraph', optional: true, greedy: true,
        description: 'Indented paragraphs under the track' },
      {
        name: 'cuePoints',
        match: 'list',
        optional: true,
        description: 'Nested list of chapters or lyrics',
        itemModel: {
          fields: [
            { name: 'time', match: 'text', optional: true,
              pattern: /\(?(\d+:\d+(?::\d+)?)\)?/,
              description: 'Timestamp' },
            { name: 'label', match: 'strong', optional: true,
              description: 'Chapter name in bold' },
            { name: 'text', match: 'text', pattern: 'remainder', optional: false,
              description: 'Lyric text or chapter name' },
            { name: 'description', match: 'paragraph', optional: true, greedy: true,
              description: 'Chapter description' },
          ],
        },
      },
    ],
  },
}
```

Given the list item:

```markdoc
- [**Bohemian Rhapsody**](/audio/bohemian.mp3) — *Queen* (5:55)
```

Markdoc parses this into inline AST nodes:

```
ListItem
├── Link (href="/audio/bohemian.mp3")
│   └── Strong
│       └── Text "Bohemian Rhapsody"
├── Text " — "
├── Em
│   └── Text "Queen"
├── Text " (5:55)"
```

The resolver:
1. Finds `Strong` → name = "Bohemian Rhapsody"
2. Finds `Link` → src = "/audio/bohemian.mp3" (extract: 'href')
3. Finds `Em` → artist = "Queen"
4. Remaining text: " — ", " (5:55)"
5. Pattern `/(\\d+:\\d+)/` matches → duration = "5:55"
6. Pattern `/—\\s*(.+)$/` has nothing left to match (artist already consumed the content after the dash)

Result: `{ name: "Bohemian Rhapsody", src: "/audio/bohemian.mp3", artist: "Queen", duration: "5:55" }`

### Link Wrapping Strong

A common pattern is a link wrapping bold text: `[**Name**](/url)`. The resolver handles this by checking children recursively. When matching `strong`, it looks inside links as well. When matching `link` with `extract: 'href'`, the strong text inside the link is still available for the `name` field. The resolver doesn't require that `strong` and `link` be siblings — one can be inside the other.

### Budget Line Items

```typescript
{
  name: 'items',
  match: 'list:unordered',
  optional: false,
  itemModel: {
    fields: [
      { name: 'description', match: 'text', pattern: /^(.+?):\s*/, optional: false },
      { name: 'amount', match: 'text', pattern: /\$([\d,.]+)/, optional: false },
    ],
  },
}
```

Given `- Brand identity: $8,000`, extracts description = "Brand identity", amount = "8,000".

### Cast/Team Members

```typescript
{
  name: 'members',
  match: 'list',
  optional: false,
  itemModel: {
    fields: [
      { name: 'name', match: 'strong', optional: false },
      { name: 'role', match: 'text', pattern: /—\s*(.+)$/, optional: true },
      { name: 'photo', match: 'image', optional: true },
      { name: 'url', match: 'link', optional: true, extract: 'href' },
    ],
  },
}
```

Given `- **Sarah Chen** — VP Engineering`, extracts name = "Sarah Chen", role = "VP Engineering".

### Recipe Ingredients

> **Note:** The current `recipe.ts` does not parse list item contents — it separates lists by type (unordered → ingredients, ordered → steps). The `itemModel` below is an enhancement that would add structured ingredient extraction on top of the existing behaviour.

```typescript
{
  name: 'ingredients',
  match: 'list:unordered',
  optional: false,
  itemModel: {
    fields: [
      { name: 'quantity', match: 'text', pattern: /^([\d./½¼¾⅓⅔]+)\s*/, optional: true },
      { name: 'unit', match: 'text', pattern: /^(g|kg|ml|l|cup|cups|tbsp|tsp|oz|lb)\s+/, optional: true },
      { name: 'ingredient', match: 'text', pattern: 'remainder', optional: false },
    ],
  },
}
```

Given `- 500g bread flour`, extracts quantity = "500", unit = "g", ingredient = "bread flour".

Given `- a pinch of salt`, no quantity or unit pattern matches, so ingredient = "a pinch of salt" via remainder.

---

## Full Rune Examples

### Hero

```typescript
contentModel: {
  type: 'delimited',
  delimiter: 'hr',
  zones: [
    {
      name: 'content',
      type: 'sequence',
      fields: [
        { name: 'eyebrow', match: 'paragraph', optional: true,
          template: 'Eyebrow text', description: 'Short text above the headline' },
        { name: 'headline', match: 'heading', optional: false,
          template: '# Your Headline', description: 'Main heading' },
        { name: 'blurb', match: 'paragraph', optional: true,
          template: 'Supporting description text.',
          description: 'Paragraph below the headline' },
        { name: 'actions', match: 'list', optional: true,
          template: '- [Get Started](/start)\n- [Learn More](/docs)',
          description: 'Action buttons as list items' },
      ],
    },
    {
      name: 'media',
      type: 'sequence',
      fields: [
        { name: 'media', match: 'any', optional: true, greedy: true,
          template: '![Alt text](/images/hero.png)',
          description: 'Image, sandbox, or showcase' },
      ],
    },
  ],
}
```

### Recipe

The migration-accurate model matches current `recipe.ts` behaviour (type-based list separation, no item parsing):

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'title', match: 'heading', optional: false,
      template: '## Recipe Name', description: 'Recipe title' },
    { name: 'description', match: 'paragraph', optional: true,
      template: 'A brief description of the dish.',
      description: 'Introductory text' },
    { name: 'image', match: 'image', optional: true,
      template: '![Recipe photo](/images/recipe.jpg)',
      description: 'Recipe photo' },
    { name: 'ingredients', match: 'list:unordered', optional: false,
      template: '- 500g flour\n- 350g water\n- 10g salt',
      description: 'Ingredient list' },
    { name: 'steps', match: 'list:ordered', optional: false,
      template: '1. First step\n2. Second step\n3. Third step',
      description: 'Cooking steps' },
    { name: 'tips', match: 'blockquote', optional: true, greedy: true,
      template: '> Chef tip: Season to taste.',
      description: 'Chef tips and notes' },
  ],
}
```

An enhanced version could add `itemModel` to the ingredients field for structured extraction (see Recipe Ingredients in the Inline Item Models section).

### Character

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'portrait', match: 'image', optional: true,
      template: '![Character portrait](/images/character.jpg)',
      description: 'Character portrait image' },
    {
      name: 'sections',
      type: 'sections',
      sectionHeading: 'heading:2',
      description: 'Character sections (Appearance, Personality, Backstory, etc.)',
      sectionModel: {
        type: 'sequence',
        fields: [
          { name: 'body', match: 'any', optional: true, greedy: true },
        ],
      },
    },
  ],
}
```

### Playlist

> **Note:** This describes the target format for the upcoming playlist/track rune redesign. See Inline Item Models section for the track `itemModel` details.

```typescript
contentModel: {
  type: 'sequence',
  fields: [
    { name: 'title', match: 'heading', optional: false,
      template: '# Playlist Name', description: 'Playlist title' },
    { name: 'cover', match: 'image', optional: true,
      template: '![Cover art](/images/cover.jpg)',
      description: 'Cover artwork' },
    { name: 'description', match: 'paragraph', optional: true,
      template: 'A description of this playlist.',
      description: 'Playlist description' },
    {
      name: 'tracks',
      match: 'list',
      optional: false,
      description: 'Track listing',
      template: '- **Track Name** (3:45)\n- **Another Track** (4:20)',
      itemModel: {
        fields: [
          { name: 'name', match: 'strong', optional: false },
          { name: 'src', match: 'link', optional: true, extract: 'href' },
          { name: 'artist', match: 'em', optional: true },
          { name: 'duration', match: 'text', optional: true,
            pattern: /\((\d+:\d+(?::\d+)?)\)/ },
          { name: 'date', match: 'text', optional: true,
            pattern: /—\s*(.+)$/ },
          { name: 'description', match: 'paragraph', optional: true, greedy: true },
          {
            name: 'cuePoints',
            match: 'list',
            optional: true,
            itemModel: {
              fields: [
                { name: 'time', match: 'text', optional: true,
                  pattern: /\(?(\d+:\d+(?::\d+)?)\)?/ },
                { name: 'text', match: 'text', pattern: 'remainder', optional: false },
                { name: 'description', match: 'paragraph', optional: true, greedy: true },
              ],
            },
          },
        ],
      },
    },
  ],
}
```

### Grid

```typescript
contentModel: {
  type: 'delimited',
  delimiter: 'hr',
  dynamicZones: true,
  zoneModel: {
    type: 'sequence',
    fields: [
      { name: 'content', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

### Accordion

```typescript
contentModel: {
  type: 'sections',
  sectionHeading: 'heading',
  emitTag: 'accordion-item',
  emitAttributes: { name: '$heading' },
  sectionModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

### Tabs

```typescript
contentModel: {
  type: 'sections',
  sectionHeading: 'heading',
  emitTag: 'tab',
  emitAttributes: { name: '$heading' },
  sectionModel: {
    type: 'sequence',
    fields: [
      { name: 'panel', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

### Timeline

```typescript
contentModel: {
  type: 'sections',
  sectionHeading: 'heading',
  headingExtract: {
    fields: [
      { name: 'date', match: 'text', pattern: /^(.+?)\s*[-–—:]\s*/, optional: true },
      { name: 'label', match: 'text', pattern: 'remainder', optional: false },
    ],
  },
  emitTag: 'timeline-entry',
  emitAttributes: { date: '$date', label: '$label' },
  sectionModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
}
```

### Itinerary

```typescript
contentModel: {
  when: [
    {
      condition: { hasChild: 'heading:2' },
      model: {
        type: 'sections',
        sectionHeading: 'heading:2',
        emitTag: 'itinerary-day',
        emitAttributes: { label: '$heading' },
        sectionModel: {
          type: 'sections',
          sectionHeading: 'heading:3',
          headingExtract: {
            fields: [
              { name: 'time', match: 'text', pattern: /^(.+?)\s*[-–—]\s*/, optional: true },
              { name: 'location', match: 'text', pattern: 'remainder', optional: false },
            ],
          },
          emitTag: 'itinerary-stop',
          emitAttributes: { time: '$time', location: '$location' },
          sectionModel: {
            type: 'sequence',
            fields: [
              { name: 'body', match: 'any', optional: true, greedy: true },
            ],
          },
        },
      },
    },
  ],
  default: {
    type: 'sections',
    sectionHeading: 'heading:3',
    headingExtract: {
      fields: [
        { name: 'time', match: 'text', pattern: /^(.+?)\s*[-–—]\s*/, optional: true },
        { name: 'location', match: 'text', pattern: 'remainder', optional: false },
      ],
    },
    emitTag: 'itinerary-stop',
    emitAttributes: { time: '$time', location: '$location' },
    sectionModel: {
      type: 'sequence',
      fields: [
        { name: 'body', match: 'any', optional: true, greedy: true },
      ],
    },
  },
}
```

### Quiz

```typescript
contentModel: {
  type: 'sections',
  sectionHeading: 'heading:2',
  sectionModel: {
    type: 'sequence',
    fields: [
      { name: 'context', match: 'paragraph', optional: true },
      {
        name: 'options',
        match: 'list:unordered',
        optional: false,
        itemModel: {
          fields: [
            { name: 'correct', match: 'text', pattern: /^\[x\]\s*/, optional: true },
            { name: 'text', match: 'text', pattern: 'remainder', optional: false },
          ],
        },
      },
      { name: 'explanation', match: 'blockquote', optional: true },
    ],
  },
}
```

### Exercise

```typescript
contentModel: {
  type: 'sections',
  sectionHeading: 'heading:2',
  fields: [
    { name: 'prompt', match: 'any', optional: false, greedy: true, beforeSections: true },
  ],
  knownSections: {
    'Hints': {
      alias: ['Hint'],
      type: 'sequence',
      fields: [
        { name: 'hints', match: 'any', optional: true, greedy: true },
      ],
    },
    'Solution': {
      type: 'sequence',
      fields: [
        { name: 'solution', match: 'any', optional: true, greedy: true },
      ],
    },
  },
}
```

The `knownSections` property maps specific heading text to section models. Sections with unrecognised headings use the default `sectionModel`. This lets the resolver identify "Hints" and "Solution" as special sections while allowing freeform additional sections.

### Form (Custom)

```typescript
contentModel: {
  type: 'custom',
  processChildren: formFieldParser,
  description: 'Converts lists to text inputs, blockquote + list to selection fields, '
    + 'headings to fieldsets, bold paragraphs to submit buttons, and blockquotes to help text. '
    + 'Selection type is inferred from option count and modifiers.',
}
```

Form uses a multi-pass state machine with blockquote lookahead, backward scanning for submit buttons, and conditional field type inference. See `packages/runes/src/tags/form.ts` for the implementation.

---

## Relationship to `@group` Decorators

The current system uses two mechanisms for content parsing:

1. **`processChildren()`** — rewrites AST children (converts headings to child tags, splits by delimiter, etc.)
2. **`@group` decorators** — filter the rewritten children by node type and section index into named properties

The `contentModel` declaration replaces **both** mechanisms for a given rune:

- The content model's field `match` types serve the same purpose as `@group({ include: [...] })` filters
- The `delimited` pattern replaces `@group({ section: N })` on `SplitLayoutModel`-based runes
- The `sections` pattern with `emitTag` replaces `headingsToList()` + `@group({ include: ['tag'] })`
- The content model's named fields map directly to what `@group` properties currently hold

During migration, a rune uses either `@group` decorators (existing system) or a `contentModel` declaration (new system), not both on the same fields. The resolver output feeds directly into `transform()`, which continues to call `createComponentRenderable()` as before.

**Migration path for `SplitLayoutModel` runes** (hero, cta, feature, steps, pricing, bento):

| Current | Content Model Equivalent |
|---|---|
| `@group({ section: 0, include: ['heading', 'paragraph'] })` | `delimited` zone 0, `sequence` with heading + paragraph fields |
| `@group({ section: 0, include: ['list', 'fence'] })` | Additional fields in zone 0's sequence |
| `@group({ section: 1 })` | `delimited` zone 1 |

---

## Resolver Engine

The resolver is a single recursive function that handles all patterns:

```typescript
interface ResolvedContent {
  [fieldName: string]: AstNode | AstNode[] | ResolvedContent | ResolvedContent[];
}

function resolve(children: AstNode[], model: ContentModel): ResolvedContent {
  // Handle conditional models
  if (model.when) {
    for (const branch of model.when) {
      if (evaluateCondition(branch.condition, children, attributes)) {
        return resolve(children, branch.model);
      }
    }
    return resolve(children, model.default);
  }

  switch (model.type) {
    case 'sequence':
      return resolveSequence(children, model.fields);
    case 'sections':
      return resolveSections(children, model);
    case 'delimited':
      return resolveDelimited(children, model);
    case 'custom':
      return { children: model.processChildren(children, attributes) };
  }
}
```

### resolveSequence

Walks children in order, matching each against the next field in the model:

```typescript
function resolveSequence(
  children: AstNode[],
  fields: FieldDefinition[]
): ResolvedContent {
  const result: ResolvedContent = {};
  let childIndex = 0;

  for (const field of fields) {
    // Skip if no more children
    if (childIndex >= children.length) {
      if (!field.optional) warn(`Missing required field: ${field.name}`);
      continue;
    }

    // If this field has a nested structural type, recurse
    if (field.type) {
      // Collect remaining children for nested resolution
      const remaining = children.slice(childIndex);
      result[field.name] = resolve(remaining, field);
      childIndex = children.length; // consumed all remaining
      continue;
    }

    const child = children[childIndex];

    if (matchesType(child, field.match)) {
      if (field.greedy) {
        const collected: AstNode[] = [];
        while (childIndex < children.length &&
               matchesType(children[childIndex], field.match)) {
          collected.push(children[childIndex]);
          childIndex++;
        }
        result[field.name] = collected;

      } else {
        result[field.name] = child;
        childIndex++;
      }

      // If this list field has an itemModel, extract structured data
      if (field.itemModel && result[field.name]) {
        result[`${field.name}Data`] = resolveListItems(result[field.name], field.itemModel);
      }

    } else if (field.optional) {
      continue; // skip, don't advance child index
    } else {
      warn(`Expected ${field.match} for "${field.name}", got ${child.type}`);
      childIndex++;
    }
  }

  return result;
}
```

### resolveSections

Splits children into groups by heading elements. When `emitTag` is set, produces child rune tag nodes instead of a dictionary:

```typescript
function resolveSections(
  children: AstNode[],
  model: SectionsModel
): ResolvedContent {
  const result: ResolvedContent = {};

  // Auto-detect heading level when sectionHeading is 'heading' (no level suffix)
  const headingMatch = model.sectionHeading === 'heading'
    ? `heading:${children.find(c => c.type === 'heading')?.attributes.level}`
    : model.sectionHeading;

  // Separate preamble (before first section heading)
  const preambleFields = model.fields?.filter(f => f.beforeSections) || [];
  let sectionStart = 0;

  if (preambleFields.length > 0) {
    const preambleChildren: AstNode[] = [];
    while (sectionStart < children.length &&
           !matchesType(children[sectionStart], headingMatch)) {
      preambleChildren.push(children[sectionStart]);
      sectionStart++;
    }
    Object.assign(result, resolveSequence(preambleChildren, preambleFields));
  }

  // Split remaining children by section headings
  let currentHeading: AstNode | null = null;
  let currentChildren: AstNode[] = [];
  const sectionEntries: Array<{ heading: AstNode; children: AstNode[] }> = [];

  for (let i = sectionStart; i < children.length; i++) {
    if (matchesType(children[i], headingMatch)) {
      if (currentHeading !== null) {
        sectionEntries.push({ heading: currentHeading, children: currentChildren });
      }
      currentHeading = children[i];
      currentChildren = [];
    } else {
      currentChildren.push(children[i]);
    }
  }
  if (currentHeading !== null) {
    sectionEntries.push({ heading: currentHeading, children: currentChildren });
  }

  // Resolve each section
  if (model.emitTag) {
    // Emit child rune tag nodes
    const emitted: AstNode[] = [];
    for (const entry of sectionEntries) {
      const headingText = extractText(entry.heading);
      const extractedFields = model.headingExtract
        ? resolveTextFields(headingText, model.headingExtract.fields)
        : {};

      // Build attributes from emitAttributes, resolving $references
      const attrs: Record<string, string> = {};
      for (const [key, ref] of Object.entries(model.emitAttributes)) {
        if (ref === '$heading') attrs[key] = headingText;
        else if (ref.startsWith('$')) attrs[key] = extractedFields[ref.slice(1)] || '';
        else attrs[key] = ref;
      }

      const sectionModel = model.knownSections?.[headingText]
        || findAlias(model.knownSections, headingText)
        || model.sectionModel;

      // Recursively resolve section body (may produce nested emitted tags)
      const resolvedBody = resolve(entry.children, sectionModel);

      emitted.push(new Ast.Node('tag', attrs, resolvedBody.children || entry.children, model.emitTag));
    }
    result.emitted = emitted;
  } else {
    // Dictionary mode (Character, Exercise, etc.)
    const sections: Record<string, ResolvedContent> = {};
    for (const entry of sectionEntries) {
      const sectionName = extractText(entry.heading);
      const sectionModel = model.knownSections?.[sectionName]
        || findAlias(model.knownSections, sectionName)
        || model.sectionModel;
      sections[sectionName] = resolve(entry.children, sectionModel);
    }
    result.sections = sections;
  }

  return result;
}
```

### resolveDelimited

Splits children by delimiter nodes, resolves each zone:

```typescript
function resolveDelimited(
  children: AstNode[],
  model: DelimitedModel
): ResolvedContent {
  const groups: AstNode[][] = [[]];

  for (const child of children) {
    if (matchesType(child, model.delimiter)) {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(child);
    }
  }

  if (model.dynamicZones) {
    // Grid-style: N zones, all using the same model
    return {
      zones: groups.map(group => resolve(group, model.zoneModel)),
    };
  }

  // Named zones: each group maps to a declared zone
  const result: ResolvedContent = {};
  model.zones.forEach((zone, i) => {
    if (i < groups.length) {
      result[zone.name] = resolve(groups[i], zone);
    }
  });

  return result;
}
```

### resolveListItems

Extracts structured data from list item inline content:

```typescript
function resolveListItems(
  listNode: AstNode,
  itemModel: ItemModel
): Record<string, any>[] {
  return listNode.children.map(listItem => {
    const result: Record<string, any> = {};
    const inlineChildren = listItem.children;

    // Phase 1: Match typed inline nodes (strong, em, link, image, code)
    const consumed = new Set<number>();

    for (const field of itemModel.fields) {
      if (field.match === 'text') continue; // handle in phase 2

      // Nested list (cue points, sub-items)
      if (field.match === 'list') {
        const nestedList = inlineChildren.find((c, i) =>
          !consumed.has(i) && matchesType(c, 'list'));
        if (nestedList) {
          consumed.add(inlineChildren.indexOf(nestedList));
          result[field.name] = field.itemModel
            ? resolveListItems(nestedList, field.itemModel)
            : nestedList;
        }
        continue;
      }

      // Block-level children (paragraphs under list items)
      if (field.match === 'paragraph' && field.greedy) {
        const paragraphs = inlineChildren.filter((c, i) =>
          !consumed.has(i) && matchesType(c, 'paragraph'));
        paragraphs.forEach(p => consumed.add(inlineChildren.indexOf(p)));
        if (paragraphs.length > 0) result[field.name] = paragraphs;
        continue;
      }

      for (let i = 0; i < inlineChildren.length; i++) {
        if (consumed.has(i)) continue;
        const child = inlineChildren[i];

        // Check direct match or match inside a link wrapper
        const matched = findInlineMatch(child, field.match);
        if (matched) {
          consumed.add(i);
          result[field.name] = field.extract
            ? matched.attributes?.[field.extract]
            : extractText(matched);
          break;
        }
      }
    }

    // Phase 2: Collect remaining text, run pattern fields
    const remainingText = inlineChildren
      .filter((_, i) => !consumed.has(i))
      .filter(c => c.type === 'text' || c.type === 'softbreak')
      .map(c => c.content || '')
      .join('')
      .trim();

    const textFields = itemModel.fields.filter(f => f.match === 'text');
    let textToProcess = remainingText;

    for (const field of textFields) {
      if (field.pattern === 'remainder') {
        result[field.name] = textToProcess.trim();
      } else if (field.pattern instanceof RegExp) {
        const match = textToProcess.match(field.pattern);
        if (match) {
          result[field.name] = match[1] || match[0];
          textToProcess = textToProcess.replace(field.pattern, '');
        }
      }
    }

    return result;
  });
}
```

---

## Editor Integration

The declarative content model directly powers the editor's visual editing features.

### Field Presence Display

When the user clicks a rune in the preview, the popover shows its content model with present and missing fields:

```
Hero
├── ○ Eyebrow          [+ Add]     "Short text above the headline"
├── ● Headline          "Welcome"
├── ● Blurb             "Build something amazing."
├── ○ Actions           [+ Add]     "Action buttons as list items"
├── ───────────
├── ○ Media             [+ Add]     "Image, sandbox, or showcase"
```

Filled circles for present fields, empty circles for optional missing fields. Descriptions come from the field's `description` property. The `[+ Add]` button inserts the field's `template` at the correct position.

For `custom` content models, the editor shows the `description` text instead of individual fields. No field-level insertion or validation is available.

### Insertion

The content model's field order defines insertion position. When the user adds an eyebrow, the editor knows it goes before the headline because `eyebrow` precedes `headline` in the model's field array. It inserts the `template` text at the appropriate source line.

For `sections` models, adding a new section means inserting a heading with the section name. The editor can suggest section names from `knownSections`:

```
Character
├── ○ Portrait          [+ Add]
├── Sections:
│   ├── ● Appearance    "Tall and gaunt..."
│   ├── ● Personality   "Calm, deliberate..."
│   ├── ○ Backstory     [+ Add]
│   ├── ○ Relationships [+ Add]
```

For `sections` with `emitTag`, the editor shows the emitted child items and allows adding new sections by inserting a heading:

```
Accordion
├── Items:
│   ├── ● "Getting Started"     [3 paragraphs]
│   ├── ● "Configuration"       [1 code block, 2 paragraphs]
│   ├── [+ Add Item]
```

### Validation

The resolver warns about missing required fields during the transform. The editor surfaces these as inline diagnostics:

```
⚠ Recipe on line 5: missing required field "ingredients" (unordered list)
⚠ Recipe on line 5: missing required field "steps" (ordered list)
```

### Source Mapping

The resolver tracks which source lines correspond to which fields. This enables preview-to-source navigation — clicking a field in the preview scrolls the source view to the correct line.

---

## Migration

### Replacing processChildren

Each rune's `processChildren` method is replaced by a `contentModel` declaration. The generic resolver handles parsing. The migration is per-rune:

1. Declare the `contentModel` on the rune schema
2. Verify the resolver produces the same output as the existing `processChildren`
3. Remove the `processChildren` method and `@group` decorators
4. Add `template` and `description` fields for editor support

The resolver output shape must match what `processChildren` currently produces so that the config, identity transform, and theme CSS continue to work unchanged.

### Format Migration

Some runes may change their content format when adopting the content model. The playlist rune replaces pipe-delimited text (`trackFields` attribute) with inline Markdown formatting (bold for name, italic for artist, links for URLs). The content model defines the target format, not the legacy format. These format changes are separate from the content model migration and should be coordinated with the rune's own redesign.

### Backward Compatibility

The resolver is a new code path. During migration, runes can be moved one at a time. Runes without a `contentModel` declaration continue to use their existing `processChildren` method. Runes with a `contentModel` use the resolver. Both paths produce the same output format.

### Validation

A test suite verifies that the resolver produces identical output to `processChildren` for every rune that has been migrated. The test provides sample Markdoc content and asserts that both paths produce the same resolved fields.

```typescript
// Migration test for each rune
test('hero resolver matches processChildren', () => {
  const input = `
{% hero %}
Short eyebrow.

# Welcome

Supporting blurb.

- [Get Started](/start)

---

![Hero](/images/hero.png)
{% /hero %}
  `;

  const legacyResult = legacyProcessChildren(parse(input));
  const resolverResult = resolve(parse(input).children, heroContentModel);

  expect(resolverResult).toEqual(legacyResult);
});
```

---

## Coverage

Feasibility analysis across all runes with `processChildren` implementations (26 total):

| Pattern | Count | Runes | Content Model |
|---|---|---|---|
| Heading → child tags | 11 | accordion, tabs, reveal, character, realm, budget, timeline, itinerary, symbol, steps, howto | `sections` + `emitTag` |
| List item parsing | 4 | music-playlist, recipe, budget, cast | `sequence` + `itemModel` |
| Delimiter splitting | 6 | hero, cta, feature, steps, pricing, bento | `delimited` (replaces `SplitLayoutModel` `@group({ section })`) |
| No-op (decorator-only) | 3 | comparison, contact, nav | `sequence` (trivial) |
| Complex state machines | 2 | form, conversation | `custom` escape hatch |

24 of 26 runes (92%) are fully declarative. The remaining 2 use the explicit `custom` escape hatch.

---

## Community Package Benefits

Package authors declare a content model and get:

- **Parsing** — the resolver handles all content extraction
- **Validation** — required field warnings at build time
- **Editor support** — field presence display, insertion templates, source navigation
- **Inspector coverage** — field auditing, content model documentation
- **Schema documentation** — the content model is self-documenting, auto-generated docs show the expected structure

No `processChildren` method to write. No custom parsing logic. The rune declaration is the implementation:

```typescript
// A community package rune — complete content parsing from declaration
export const recipeCard: RuneDefinition = {
  name: 'recipe-card',
  attributes: {
    servings: { type: 'string', optional: true },
    difficulty: { type: 'string', matches: ['easy', 'medium', 'hard'], optional: true },
  },
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'title', match: 'heading', optional: false,
        template: '## Recipe Name' },
      { name: 'image', match: 'image', optional: true,
        template: '![Photo](/images/recipe.jpg)' },
      { name: 'ingredients', match: 'list:unordered', optional: false,
        template: '- 500g flour\n- 350g water' },
      { name: 'steps', match: 'list:ordered', optional: false,
        template: '1. Mix ingredients\n2. Bake' },
      { name: 'notes', match: 'blockquote', optional: true,
        template: '> A helpful tip.' },
    ],
  },
};
```

This is the entire rune definition. No class, no methods, no imperative code. The resolver, editor, and validator all derive their behaviour from this declaration.

---

## Attribute Migration: `typeof`/`property` → `data-rune`/`data-field`

The content model migration is an opportunity to clean up how rune identity and semantic fields are expressed in the rendered output. The current approach uses RDFa attributes (`typeof`, `property`) for internal dispatch purposes, which pollutes the final HTML with invalid RDFa for the majority of runes that have no Schema.org equivalent.

### Current State

The `typeof` and `property` attributes serve multiple purposes across the pipeline:

| Stage | Attribute | Purpose |
|-------|-----------|---------|
| Schema transform (`createComponentRenderable`) | `typeof` | Sets internal type name on root tag (e.g., `typeof="Hero"`) |
| Schema transform (`createComponentRenderable`) | `property` | Sets field name on child property tags (e.g., `property="headline"`) |
| Identity transform (engine) | `typeof` | Looks up `RuneConfig` for BEM classes, modifiers, structure |
| Identity transform (engine) | `property` | Identifies consumed meta tags (modifiers, tint, bg) |
| Identity transform (engine) | `data-rune` | **Already emitted** — lowercase type name (e.g., `data-rune="hero"`) |
| Renderer (Svelte) | `typeof` | Dispatches to registered Svelte component |
| SEO extraction | `typeof` | Finds rune tags to extract Schema.org structured data |
| SEO extraction | `property` | Finds child fields (headline, blurb, price, etc.) |
| Final HTML | `typeof` + `data-rune` | Both present — redundant |

The identity transform engine already emits `data-rune` alongside `typeof` (`engine.ts:388`). This means `typeof` is redundant for config lookup purposes — the migration is partially underway.

### Problem

Only ~17 rune types map to real Schema.org types. The remaining ~45+ types emit `typeof="Hero"`, `typeof="Feature"`, `typeof="Swatch"`, etc. in the final HTML — these are invented names with no Schema.org meaning, producing invalid RDFa that confuses search engine crawlers and accessibility tools.

### Target State

| Purpose | Current | Target |
|---------|---------|--------|
| Engine config lookup | `typeof` | `data-rune` (already emitted) |
| Renderer component dispatch | `typeof` | `data-rune` |
| SEO type discovery | `typeof` search via `seoTypeMap` | `data-rune` search via `seoTypeMap` |
| SEO field extraction | `property` attribute on child tags | `property` (unchanged — works the same) |
| Meta tag identification | `property` on consumed meta tags | `property` (unchanged — stripped before final HTML) |
| Root tag semantic field | `property="contentSection"` | `data-field="contentSection"` |
| Final HTML: Schema.org types | `typeof="Pricing"` (wrong — internal name) | `typeof="Product"` (correct Schema.org type) |
| Final HTML: non-Schema.org types | `typeof="Hero"` (invalid RDFa) | Removed — `data-rune` only |

After migration, the final HTML for a non-Schema.org rune looks like:

```html
<!-- Before -->
<section typeof="Hero" property="contentSection" class="rf-hero" data-rune="hero">

<!-- After -->
<section class="rf-hero" data-rune="hero" data-field="contentSection">
```

And for a Schema.org rune:

```html
<!-- Before -->
<section typeof="Pricing" property="contentSection" class="rf-pricing" data-rune="pricing">

<!-- After -->
<section typeof="Product" class="rf-pricing" data-rune="pricing" data-field="contentSection">
```

### Sub-Component Types

Types like `Command`, `LinkItem`, `AccordionItem`, `Tier`, `BreadcrumbItem`, `TimelineEntry`, and `CastMember` are not author-facing runes. They are synthetic types created inside a parent rune's transform — for example, the hero wraps fence blocks in `createComponentRenderable(schema.Command, {...})`. Nobody writes `{% command %}` in Markdown.

These sub-component types follow the same migration pattern as runes:

- Use `data-rune` for engine config lookup and Renderer component dispatch
- Only emit `typeof` when they map to a Schema.org type

The engine and Renderer both use a single config/component map with no distinction between top-level runes and sub-components. A separate `data-component` attribute would fragment the lookup mechanism for no practical benefit. `data-rune` is understood as "rune system component" — the identity transform and Renderer treat all tagged nodes identically regardless of whether they correspond to an author-facing Markdoc tag.

### `schemaOrgType` on Type Definitions

To support this, the `Type` interface in `packages/types/src/schema/` gains an optional `schemaOrgType` field:

```typescript
interface Type {
  name: string;           // Internal name (e.g., 'Pricing', 'AccordionItem')
  schemaOrgType?: string; // Schema.org type (e.g., 'Product', 'Question')
}
```

`createComponentRenderable()` uses this to decide what to emit:

```typescript
function createComponentRenderable(type: Type, result: TransformResult) {
  // Always emit data-rune for internal dispatch
  const attrs: Record<string, any> = {
    'data-rune': type.name.toLowerCase(),
  };

  // Only emit typeof for types with a Schema.org mapping
  if (type.schemaOrgType) {
    attrs.typeof = type.schemaOrgType;
  }

  // ...rest unchanged
}
```

### Schema.org Type Mapping

The following types get real Schema.org `typeof` attributes. All other types (~45+) emit only `data-rune`.

**Rune-level:**

| Internal Type | Schema.org `typeof` | Extractor |
|---------------|---------------------|-----------|
| `Accordion` | `FAQPage` | `extractFAQPage` |
| `Pricing` | `Product` | `extractProduct` |
| `Testimonial` | `Review` | `extractReview` |
| `Breadcrumb` | `BreadcrumbList` | `extractBreadcrumbList` |
| `Timeline` | `ItemList` | `extractItemList` |
| `Video` | `VideoObject` | `extractVideoObject` |
| `Showcase` | `ImageObject` | `extractImageObject` |
| `MusicPlaylist` | `MusicPlaylist` | `extractMusicPlaylist` |
| `Recipe` | `Recipe` | `extractRecipe` |
| `HowTo` | `HowTo` | `extractHowTo` |
| `Event` | `Event` | `extractEvent` |
| `Character` / `Cast` | `Person` | `extractPerson` |
| `Organization` | `Organization` | `extractOrganization` |
| `DataTable` | `Dataset` | `extractDataset` |
| `Realm` / `Map` | `Place` | `extractPlace` |
| `Changelog` | `Article` | `extractArticle` |
| `Plot` | `CreativeWork` | `extractCreativeWork` |

**Sub-component-level:**

| Internal Type | Schema.org `typeof` | Used by |
|---------------|---------------------|---------|
| `AccordionItem` | `Question` | FAQPage extractor |
| `Tier` / `FeaturedTier` | `Offer` | Product extractor |
| `BreadcrumbItem` | `ListItem` | BreadcrumbList extractor |
| `TimelineEntry` | `ListItem` | ItemList extractor |
| `CastMember` | `Person` | Person extractor |
| `MusicRecording` | `MusicRecording` | MusicPlaylist extractor |

### Migration Steps

The migration is coordinated with the content model migration — each rune adopts `data-rune` as part of its conversion to `createContentModelSchema()`. The infrastructure changes (steps A–D) can be done once upfront.

**Step A — Add `schemaOrgType` to Type definitions.** Update `packages/types/src/schema/` to add the optional field. Populate it for the ~23 types listed above.

**Step B — Update `createComponentRenderable()`.** Emit `data-rune` (lowercase type name) on the root tag. Only emit `typeof` when the Type has `schemaOrgType`, using the Schema.org value (e.g., `typeof="Product"` not `typeof="Pricing"`).

**Step C — Switch Renderer component dispatch.** In `packages/svelte/src/Renderer.svelte`, change `node.attributes?.typeof` to `node.attributes?.['data-rune']` for component registry lookup. Update the component registry keys to use lowercase names.

**Step D — Switch engine config lookup.** In `packages/transform/src/engine.ts`, change `tree.attributes?.typeof` to `tree.attributes?.['data-rune']` for `RuneConfig` lookup. Update `runes` config keys to lowercase. Remove the engine's own `data-rune` emission (it's now set earlier by `createComponentRenderable()`).

**Step E — Update SEO extraction.** In `packages/runes/src/seo.ts`, change `buildSeoTypeMap` to map `data-rune` values (lowercase) to `seoType` strings. Update `extractSeo` to search by `data-rune` instead of `typeof`. Internal extractors that search for child sub-components by `typeof` (e.g., `t.attributes.typeof === 'AccordionItem'`) switch to `data-rune`. The `property` attribute on child tags remains unchanged — SEO extractors continue to use `findProperty()` as before.

**Step F — Replace root-level `property`.** In `createComponentRenderable()`, replace `property` on the root tag with `data-field`. The `property` on internal meta tags is consumed and stripped by the engine before final HTML — it remains unchanged as an internal mechanism.

**Step G — Update consumers.** Update tests, behaviors (`packages/behaviors/`), CLI inspector (`packages/cli/`), and any CSS selectors that reference `typeof` or `[typeof="X"]`. The `data-rune` attribute is already emitted in the current system, so CSS and JS that uses `[data-rune]` continues to work.

### OG Meta Extraction

The OG meta extractor in `seo.ts` searches for `typeof === 'Hero'` to extract page title and description fallbacks. This changes to `data-rune === 'hero'`. The `findProperty()` calls for `headline` and `blurb` remain unchanged since `property` on child tags is an internal attribute not affected by this migration.

### Backward Compatibility

- `data-rune` is already emitted by the identity transform, so any CSS or JS that uses it continues to work unchanged
- CSS selectors using `[typeof="X"]` (if any in custom themes) need to migrate to `[data-rune="x"]` — the `x` is lowercase
- Theme Svelte components receiving `tag.attributes.typeof` need to switch to `tag.attributes['data-rune']`
- The migration can be done incrementally per-rune alongside the content model migration, though the infrastructure changes (steps A–D) should be done first as a single coordinated change
