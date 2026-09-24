{% bug id="BUG-029" status="confirmed" severity="minor" source="SPEC-003" tags="runes,content-model,sections,knownSections,emitTag" %}

# `knownSections` heading normalisation is inert when `emitTag` is set

`resolveSections` has two branches. The `emitTag` branch
(`packages/runes/src/lib/resolver.ts:480-502`) builds a tag node per section and
returns — it never calls `matchKnownSection`:

```ts
if (model.emitTag) {
	const tagNodes = rawSections.map((section) => {
		const headingText = extractHeadingText(section.headingNode);
		// …emitAttributes read `$heading` — the RAW heading text
		return new Ast.Node('tag', attrs, section.body, model.emitTag!);
	});
	return { ...preamble, sections: tagNodes };
}
```

So a rune declaring both `emitTag` and `knownSections` gets no alias matching,
no `canonicalSlug`, and no `i18nAliases` — silently, with no warning and nothing
in the types or the docs to say so.

## Not all of `knownSections` is a gap

`model` being ignored here is **principled** and should stay that way: once a
section is handed to a child rune, that rune's own schema owns its content
model, and a parent-declared body model would be a second authority over the
same content ({% ref "ADR-028" /%}).

The other three fields are the gap. They are about *heading matching*, not body
structure, and every one of them is meaningful under `emitTag`:

| Field | Purpose | Meaningful with `emitTag`? |
|---|---|---|
| `alias` | `## AC` → `Acceptance Criteria` | **yes** — `emitAttributes: { name: '$heading' }` should be able to emit the canonical name |
| `canonicalSlug` | language-stable `data-name` | **yes** — same cross-locale CSS/anchor problem |
| `i18nAliases` | `## Akzeptanzkriterien` matches | **yes** — same |
| `model` | body content model | no — the child rune owns it |

## Steps to Reproduce

Declare a `sections` model with both `emitTag` and a `knownSections` entry
carrying an `alias`, then author a section using the alias.

## Expected

Either the alias resolves — `$heading` emits the canonical name — or the schema
is rejected at construction time for declaring something that cannot take
effect.

## Actual

The alias is ignored. `emitAttributes: { name: '$heading' }` emits the raw
heading text, so `## AC` and `## Acceptance Criteria` produce two different
child runes with two different names and two different slugs.

## Notes

- **No rune combines them today**, so there is no live defect. The split is
  clean: `work`, `bug` and `decision` declare `knownSections` and no `emitTag`;
  `accordion`, `character`, `realm`, `faction`, `reveal`, `timeline` and
  `itinerary` declare `emitTag` and no `knownSections`. Severity is `minor` for
  that reason — this is a trap, not a failure.
- It is a trap with no guardrail. The combination reads as obviously sensible,
  type-checks, and does nothing.
- Two fixes, not equivalent:
  1. **Make it work** — run `matchKnownSection` in the `emitTag` branch too, and
     let `$heading` resolve to the canonical name (with the raw text still
     available, since some runes will want what the author wrote). Adds a
     capability; changes no existing output, because nothing declares both.
  2. **Reject it** — error at schema construction when `knownSections` is
     declared alongside `emitTag`, naming `model` as the one field that would
     have been ignored anyway. Cheap, and makes the limit visible.
  Preference is (1): the aliases are the reason `knownSections` exists
  ({% ref "WORK-024" /%}), and denying them to half the section runes is a
  narrower product than the field names imply.
- Surfaced while typing `resolveSections`' return shape for
  {% ref "SPEC-142" /%}. The type has to discriminate on `emitTag` anyway, which
  is what made the asymmetry visible.

## References

- {% ref "WORK-024" /%} — added `knownSections` for validation, aliases and templates
- {% ref "SPEC-142" /%} — typing the transform signature; where the `emitTag` discriminant surfaced
- {% ref "ADR-028" /%} — rune identity is not redefinable from outside; why `model` should stay ignored here

{% /bug %}
