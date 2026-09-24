{% work id="WORK-593" status="done" priority="medium" complexity="simple" source="SPEC-134" tags="editor, snippet, reviewed, adoption, docs, drift" milestone="v0.37.0" pr="refrakt-md/refrakt#649" %}

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

## Resolution

Completed: 2026-09-24

Branch: `claude/v0-37-0-review-vqpl41`
PR: refrakt-md/refrakt#649 (batched with WORK-591 and WORK-592)

### What was done

- **`packages/editor/src/stamp-on-insert.ts`** (new), wired into the editor's
  PUT handler so a page is stamped as it is saved.
- The marking pass over `site/content`.
- Review-marker documentation on `site/content/runes/snippet.md`, including
  the selection rule.
- **`packages/editor/test/stamp-on-insert.test.ts`** — 10 tests.

### Notes

- **Stamping happens on save, not on template insertion.** The editor's rune
  templates are skeletons — at the moment a `{% snippet %}` is dropped in it
  has no `path=`, so there is no slice to hash. The first point the invocation
  names a real region is the write.
- **It reuses WORK-592's hashing rather than recomputing.** A marker written by
  the editor and one written by the CLI must be the same value for the same
  content, or `--check` would fire on everything the editor touched. Pinned by
  a test comparing against `formatMarker(hashSlice(...))` directly.
- **Existing markers are never touched on save.** Re-stamping would silently
  clear a marker that was asking for a review — the one thing this feature
  cannot do.

### The selection, recorded

**Exactly one reference is marked**, and the reason is the finding rather than
a shortfall.

Almost every live `snippet` in `site/content` demonstrates the rune that
quotes it: the prose says "here is what `lines=` does", not "this code means
X", so a change to the quoted file does not make the sentence false. Marking
them would make `--check` permanently noisy and train everyone to ignore it,
which is exactly D8's warning.

Marked:
- `runes/file-ref.md:67` — `symbol="SiteConfig"`, where the drawer content
  is the subject of the sentence around it.

Deliberately not marked:
- All of `runes/snippet.md` — demonstrations of the rune, including several
  that slice mid-construct precisely to show what line addressing does.
- `runes/codegroup.md`, `runes/drawer.md`, `runes/file-ref.md:24,72` —
  the same, for their own runes.
- `index.md:8` — `path=$file.path`, self-referential and not statically
  resolvable.
- `releases.md:842` — whole-file embed of a changelog.

**`refrakt snippet review <page>` stamped two; one was removed by hand.** The
second was a `file-ref` at `package.json`, which changes on every dependency
bump and would fire constantly while certifying nothing. The tool was right to
stamp it — it stamps unmarked invocations on the page it is given, and deciding
which deserve a marker is a human's job. That is what this item is for.

The pages that would most benefit are the guides, and they do not quote code at
all — which is WORK-595's observation, and the reason that item exists.

### Verification

`refrakt snippet review --check` runs clean across `site/content`, exit 0.

{% /work %}
