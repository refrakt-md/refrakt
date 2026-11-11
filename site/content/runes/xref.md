---
title: Xref
description: Inline cross-references that resolve entities by ID or name from the entity registry
category: Reuse & references
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:xref"} /%}

Link to a page, a character, a spec or any other entity by naming it: the build finds the page, builds the link and uses the entity's title as the link text. `{% ref %}` is the same rune under another name, so `{% ref "WORK-026" /%}` is documented here. To put the entity's content into the page instead of a link to it, use [expand](/runes/expand); to link a project file by its path, use [file-ref](/runes/file-ref); for a side panel that a reference opens, declare a [drawer](/runes/drawer).

## Basic usage

Give the entity's ID. A page's ID is its URL:

{% preview source=true %}

Shared files live in {% xref "/docs/authoring/partials" /%}; to place an entity's content on the page, use {% xref "/runes/expand" /%}.

{% /preview %}

Other entities carry their own IDs: on a site that publishes its plan, `{% xref "WORK-9138" /%}` links to that work item and reads its title.

## Link by name

Entities with a name, such as characters and places, can be referenced by it. The match ignores case.

{% preview source=true %}

{% xref "Veshra" /%} never forgave the betrayal, and never returned to {% xref "Hollowmere" /%}.

{% /preview %}

When two entities share a name, add `type` to say which one you mean: `{% xref "Hollowmere" type="realm" /%}`. Without it, the first match wins and the build warns.

## Change the link text

`label` replaces the entity's title as the link text. The link still points to the entity.

{% preview source=true %}

{% xref "Veshra" label="The Bone Witch" /%} watched the gates of Hollowmere close behind her.

{% /preview %}

## Preview drawer

Set `preview="drawer"` to keep the inline link and open the entity's content in a [drawer](/runes/drawer) when it is clicked, without leaving the page.

{% preview source=true %}

The plan behind {% ref "SPEC-078" preview="drawer" label="this preview drawer" /%} opens here in a drawer, without leaving the page.

{% /preview %}

The drawer shows what [expand](/runes/expand) would place on the page, with a link to the entity's own page at the foot. Several references to the same entity share one drawer. To change what the drawer shows, write a `{% drawer %}` with the entity's ID yourself; the reference opens yours instead. [file-ref](/runes/file-ref) takes the same `preview` attribute for files.

## What you can link to

Anything a rune or page registers as an entity:

| Source | Entity types | Example |
|--------|-------------|---------|
| Core | `page`, `heading` | `{% xref "/docs/getting-started" /%}` |
| Frontmatter `type` | that type, such as `rune` | `{% xref "/runes/hint" /%}` |
| @refrakt-md/storytelling | `character`, `realm`, `faction`, `lore`, `plot` | `{% xref "Veshra" /%}` |
| @refrakt-md/plan | `spec`, `work`, `bug`, `decision`, `milestone` | `{% xref "SPEC-078" /%}` |

See [Entities](/docs/authoring/entities) for where entities come from.

## Link to other systems

IDs that no entity carries, such as issue numbers or RFCs, can still become links. Add patterns to `xrefs` in `refrakt.config.json`; the first pattern whose `match` fits the ID builds the URL:

```jsonc
{
  "xrefs": [
    {
      "match": "^GH-(?<num>\\d+)$",
      "template": "https://github.com/myuser/myrepo/issues/{num}",
      "type": "github-issue",
      "label": "GitHub #{num}"
    },
    {
      "match": "^RFC-(?<num>\\d+)$",
      "template": "https://datatracker.ietf.org/doc/html/rfc{num}",
      "label": "RFC {num}"
    }
  ]
}
```

With these, `{% ref "GH-42" /%}` links to issue 42 and reads "GitHub #42".

| Field | Required | Meaning |
|-------|----------|---------|
| `match` | yes | A regular expression, matched against the whole ID. A named group such as `(?<num>...)` can be used as `{num}` in `template` and `label`. |
| `template` | yes | The URL. `{id}` is the whole ID. |
| `type` | no | A name a theme can style the link by. Default: `external`. |
| `label` | no | The link text, with the same placeholders. Default: `{id}`. A `label` on the reference overrides it. |

A pattern also supplies the URL for an entity that has no page of its own, such as plan content outside the site; the entity still supplies the link text. See [configuration](/docs/configuration/overview) for the rest of the config file.

## References that don't resolve

A reference that matches no entity and no pattern renders as text marked unresolved rather than as a link, and the build warns. The build still succeeds, so you can reference something before it is written.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:xref"} /%}
