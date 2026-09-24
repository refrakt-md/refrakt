{% work id="WORK-593" status="in-progress" priority="medium" complexity="simple" source="SPEC-134" tags="editor, snippet, reviewed, adoption, docs, drift" milestone="v0.37.0" %}

# Stamp-on-insert in the editor, and marking the reference pages

{% ref "SPEC-134" /%} phase 3, minus the validation rail. The feature exists
after {% ref "WORK-592" /%}; this is the part that gets it used.

Two pieces, both small:

- **The block editor stamps on insert**, so anything authored through `refrakt
  edit` starts marked. A snippet inserted by a human who just looked at the code
  is the one moment when a marker is unambiguously honest — it costs nothing and
  it is the only stamping that needs no review step. `snippet` and `file-ref`
  only: {% ref "WORK-591" /%} does not accept `reviewed` on `expand`, so there
  is nothing for the editor to stamp there.
- **Mark the reference pages whose prose makes specific claims.** Deliberately
  not all of them.

## Adoption is selective on purpose (D8)

Marking every snippet would make `--check` permanently noisy and train everyone
to ignore it. Authors mark the references whose prose makes specific claims
about the code beside them.

The selection is the work here, not the stamping — `refrakt snippet review
<page>` does the mechanical part. Reading a page and deciding whether its
paragraphs actually assert something about the slice is what this item is for.

The natural starting set is the pages {% ref "WORK-590" /%} migrated, since
those are the invocations someone has just looked at closely — but migration and
marking are different claims and must stay different commits.

## The validation rail is not here

{% ref "SPEC-134" /%} phase 3 lists the editor validation rail alongside these
two. That rail is {% ref "WORK-395" /%}'s, which is unmilestoned and outside
this milestone. Stale markers reach their audience through the dev-server
diagnostics {% ref "WORK-575" /%} shipped and through `--check`; the rail is an
improvement on that, not a prerequisite for it.

## Acceptance Criteria

- [x] The block editor stamps `reviewed` when inserting a `snippet` or a `file-ref`
- [x] The editor does **not** stamp `expand` — {% ref "WORK-591" /%} does not accept `reviewed` there, because `expand` resolves no slice to hash
- [x] A snippet inserted through the editor whose target has not changed does not immediately report stale
- [x] The reference pages whose prose makes specific claims about a quoted slice are marked, with the selection recorded rather than exhaustive
- [x] Marking is a separate commit from {% ref "WORK-590" /%}'s migration
- [x] `--check` runs clean across `site/content` after the marking pass

## Approach

Stamp-on-insert reuses {% ref "WORK-592" /%}'s stamping path rather than
recomputing a hash in the editor package — the normalization must not have two
implementations.

For the marking pass, work page by page and write down why each page was or was
not marked. That record is what stops the next person marking everything.

## Blocked by

- {% ref "WORK-592" /%} — the stamping path and the review CLI

## Notes

If `--check` is noisy immediately after this lands, the remedy is **unmarking
pages**, not loosening normalization. A marker that fires on a page whose prose
did not actually depend on the slice is a selection error, and normalization is
the wrong place to fix it.

## References

- {% ref "SPEC-134" /%} — phase 3, D8 (opt-in per invocation, never bulk)
- {% ref "WORK-592" /%} — the stamping path
- {% ref "WORK-395" /%} — the editor validation rail, out of scope here
- {% ref "WORK-575" /%} — the dev-server diagnostics markers surface through today

{% /work %}
