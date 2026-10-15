{% bug id="BUG-041" status="confirmed" severity="minor" tags="plan, cli, create, milestones, filenames" milestone="v0.41.1" %}

# plan create milestone names the file after the title, not the version

Milestones keep their semver name as the filename (`v1.0.0.md`). CLAUDE.md states the
convention, and so does the comment above the line in `runCreate` that breaks it
(`plugins/plan/src/commands/create.ts`):

```ts
// … Milestones use their semver name as the whole filename.
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const fileName = isAutoIdType(type) ? `${id}-${slug}.md` : `${slug}.md`;
```

For a milestone, `${slug}.md` is built from the **title**. `--id` sets only the `name`
attribute inside the file.

This is how 17 milestones, v0.20.1 through v0.41.0, came to be filed under a slug
(`composed-runes-you-can-ship.md` for v0.41.0, and so on). They were renamed by hand on
`claude/site-changelog-readability-k4p902`. That branch also reproduced the bug once more when
it created v0.41.1. Until it is fixed, every milestone created with the CLI drifts again.

Nothing repairs the drift afterwards. `plan migrate filenames` skips milestones
(`plugins/plan/src/commands/migrate.ts`, `if (entity.type === 'milestone')`), and
`plan validate` does not compare a milestone's filename with its `name`.

A test pins the wrong behaviour: `create.test.ts`, "throws on duplicate file for non-prefixed
types (milestone)", expects `v1.0` and `v2.0` with the same title to collide on the filename.

## Steps to Reproduce

1. `refrakt plan create milestone --id v9.9.9 --title "Something to ship"`

## Expected

`plan/milestones/v9.9.9.md`.

## Actual

`plan/milestones/something-to-ship.md`, containing `{% milestone name="v9.9.9" … %}`.

## Environment

- `@refrakt-md/plan` at the current `main`.

## Acceptance Criteria

- [ ] `plan create milestone --id <name>` writes `milestones/<name>.md`, whatever the title
- [ ] Two milestones with different names and the same title both create, and the test that expected them to collide is replaced by one that expects two files
- [ ] Creating a milestone whose name already exists still fails with the duplicate-ID error
- [ ] `plan migrate filenames` renames a milestone whose filename is not `<name>.md`, and still never touches one that already is
- [ ] Docs that describe milestone filenames match the behaviour

## References

- The 17 renames: commit "plan: rename slug-named milestone files to their semver names" on
  `claude/site-changelog-readability-k4p902`.

{% /bug %}
