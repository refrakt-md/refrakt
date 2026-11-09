{% bug id="BUG-049" status="confirmed" severity="minor" source="SPEC-142" tags="plan, pipeline, criteria, progress, milestone" %}

# A work item's criteria count is a regex over its whole text, so stray checkbox markers skew milestone progress

Recorded by {% ref "SPEC-142" /%} D6 and carried here when that spec was superseded. Confirmed by
reading the code.

The page-walk register loop counts a work or bug item's progress like this:

```ts
// plugins/plan/src/pipeline.ts:88
function countCheckboxes(tag) {
	const text = textContent(tag);
	const unchecked = (text.match(/\[ \]/g) || []).length;
	const checked = (text.match(/\[x\]/gi) || []).length;
	return { checked, total: checked + unchecked };
}
```

called for every `work` and `bug` rune (`pipeline.ts:565`) to set `checkedCount` and `totalCount`,
which the milestone progress rollup reads.

Three things are wrong with it:

1. **It reads the whole item, not its Acceptance Criteria.** A `[ ]` or `[x]` anywhere in the
   text counts: in a code sample, in prose quoting a criterion, in a Resolution that lists what
   was checked.
2. **It disagrees with the other path.** The unconditional-scan path counts from the structured
   `entity.criteria` list that `parseFileContent` already produced (the comment at
   `pipeline.ts:470` says the two have "the same shape on data"). They have the same shape but
   not the same input, so the same item can report different counts depending on which path
   built the site.
3. **It knows two markers where the engine knows four.** The engine's checkbox detection
   (`CHECKBOX_RE`, `packages/transform/src/engine.ts:762`) also reads `[>]` (active) and `[-]`
   (skipped). Neither is counted here, so a skipped criterion silently leaves the total.

## Steps to Reproduce

1. Create a work item with two criteria, one checked:

   ```markdoc
   ## Acceptance Criteria

   - [x] First criterion
   - [ ] Second criterion

   ## Notes

   The syntax for a done criterion is `- [x] text`.
   ```

2. Build a plan site that renders it, and read the item's `checkedCount` / `totalCount` (or the
   milestone progress bar).

## Expected

`1` of `2`: only the Acceptance Criteria section counts, and it agrees with the count
`entity.criteria` gives.

## Actual

`2` of `3`: the `[x]` in the Notes counts as a checked criterion.

## Approach

- Count from the structured criteria, not from text: the page-walk path should read the same
  list the scan path does, or both should read the Acceptance Criteria section through a
  content model.
- {% ref "SPEC-142" /%} D6 pointed at the long-term form: a per-section content model on `work`'s
  Acceptance Criteria (`knownSections.<name>.model`, `resolver.ts:518`) that resolves it as a
  checklist. When the plan runes move to definitions ({% ref "SPEC-152" /%}), that model belongs in
  `work`'s frontmatter.
- Decide whether `[-]` (skipped) counts toward the total, and whether `[>]` (active) counts as
  unchecked, and apply the same rule on both paths.
- Add a test with a stray marker outside the criteria section, and one comparing the two paths.

## References

- {% ref "SPEC-142" /%} D6: where this was first noted.
- {% ref "SPEC-152" /%}: the plan runes as compositions.

{% /bug %}
