{% bug id="BUG-019" status="confirmed" severity="minor" source="SPEC-130" tags="runes,marketing,seo" %}

# A comma attribution leaves the comma in the testimonial role

`{% testimonial %}` parses its attribution line as `**Name** — Role`, stripping a
leading `-`, `–` or `—` from the text after the `<strong>`. It does not strip a
comma, so the comma form — which is the obvious alternative and which nothing
rejects — carries the separator into the role.

## Steps to Reproduce

1. Write a testimonial whose attribution uses a comma rather than an em dash:

   ```
   {% testimonial rating=4 %}
   > The semantic approach just makes sense.

   **Alex Rivera**, CTO at Acme
   {% /testimonial %}
   ```

2. Read the rendered role, and the `jobTitle` in the page's JSON-LD.

## Expected

`CTO at Acme` — the same result the documented em-dash form gives.

## Actual

`, CTO at Acme`, in both channels. Recorded in
`contracts/seo-baseline/baseline.json` under the `testimonial.comma` fixture:

```json
"author": { "@type": "Person", "jobTitle": ", CTO at Acme", "name": "Alex Rivera" }
```

## Cause

`plugins/marketing/src/tags/testimonial.ts`:

```ts
.replace(/^\s*[-–—]\s*/, '')
.trim()
```

The character class covers three dashes. `.trim()` removes whitespace, so a
leading comma survives at position 0.

## Why it was left alone by WORK-571

{% ref "WORK-571" /%} required this defect to be preserved or fixed
*deliberately*, and the choice recorded rather than made by accident. Preserved,
for two reasons:

- The defect is in the **attribution parser**, not the schema mapping.
  `testimonialSchema` reads `author-role` faithfully; the text handed to it is
  what is wrong. {% ref "SPEC-130" /%}'s scope is the mapping.
- Fixing it changes **rendered HTML** on every comma-form testimonial, not just
  the structured data. That is a separate user-visible change and deserves its
  own review and its own changeset entry rather than riding inside a migration
  whose whole evidence is "the baseline diff shows only what was intended".

## Fix

Widen the character class to include a comma, and cover the form in the rune's
tests and its documentation — the docs currently show only the em dash, so the
comma form is undocumented as well as mishandled. Decide at that point whether
the comma form should be *supported* or *rejected*; supporting it is the smaller
change and matches what authors evidently write.

Regenerating the baseline will show the `testimonial.comma` fixture's `jobTitle`
losing its leading comma, and nothing else.

## Environment

- Found against the v0.35.0 line, in `@refrakt-md/marketing`
- Predates {% ref "SPEC-130" /%}; recorded by {% ref "WORK-562" /%}'s baseline

{% /bug %}
