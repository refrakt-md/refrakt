---
"@refrakt-md/types": minor
"@refrakt-md/content": minor
"@refrakt-md/plan": minor
---

Plan plugin: unconditional scan of `plan.dir`, entity registration with `sourceFile` + `extract`, dynamic `plan:` file-root namespace (SPEC-064).

The plan plugin's `register` pipeline hook now performs an unconditional scan of the project's `plan.dir` after processing site-loaded pages. Every parseable plan entity (`spec`, `work`, `bug`, `decision`, `milestone`) found on disk is registered into the `EntityRegistry`, regardless of whether the file is part of any site's content tree. This is what makes the `{% expand "SPEC-023" /%}` rune (SPEC-066) work for plan content that isn't published to the site.

Each registration includes:

- `sourceFile` — project-root-relative POSIX path to the source `.md` file.
- `extract` — a closure that returns the top-level plan rune AST node from a freshly-parsed source file, or `null` if the file's structure has been edited away from the expected shape. Consumed by `{% expand %}` for inline substitution.

Site-load registrations win any duplicate (they have a real `sourceUrl`); the scan skips files whose entity is already in the registry. Files with no parseable plan rune (READMEs, notes) are silently skipped — the filename convention is a hint, not a filter, so files like `arbitrarily-named.md` still register if they contain a valid `{% spec id="..." %}` rune. Duplicate IDs across two plan files surface as an error naming both file paths.

**New `EntityRegistration` fields** (`@refrakt-md/types`):

- `sourceFile?: string` — project-root-relative path to the source `.md` file backing the entity. Populated by plugins that scan disk; consumed by content-embedding runes.
- `extract?: (parsedSource) => Node | null` — extracts the entity's top-level AST node from a freshly-parsed source file. Paired with `sourceFile`.

**New `PluginPipelineHooks.configure` lifecycle**:

```ts
configure?: (opts: PluginConfigureOptions) => void | Promise<void>;

interface PluginConfigureOptions {
  config: unknown;        // the full RefraktConfig
  configDir: string;      // directory containing refrakt.config.json
  registerFileRoot?: (namespace: string, absolutePath: string) => void;
}
```

Runs once per build before any other hook, giving plugins access to the user's config and the ability to register file-root namespaces dynamically (when the right path can't be statically declared on `Plugin.fileRoots`). The plan plugin uses both: it reads `plan.dir` from the config and registers `plan:` pointing at the user's actual plan directory.

**`Plugin.fileRoots: { plan: '../../plan' }` was NOT added.** That static declaration would point at the wrong directory for npm-installed users (`node_modules/plan/` rather than the user's project-root `plan/`). The plan plugin doesn't ship plan content — users have their own — so the namespace path is fundamentally per-project. Dynamic registration via `configure` is the correct mechanism.

The `register` hook still emits the existing site-load registrations for plan pages published to a site; the scan is additive.
