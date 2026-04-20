{% spec id="SPEC-042" status="draft" version="1.0" tags="plan, cli, create-refrakt, onboarding, dx" %}

# Plan Target for create-refrakt

Add a planning-only scaffold option to `create-refrakt` so users who want to adopt refrakt primarily as a plan management tool have a one-command entry point, matching the experience for sites and themes.

## Problem

`create-refrakt` is the advertised entry point to the refrakt ecosystem, but it only knows how to scaffold full sites (SvelteKit, Astro, Nuxt, Next, Eleventy, static HTML) and theme packages. Users who want refrakt solely for its planning features (`@refrakt-md/plan` — specs, work items, bugs, decisions, milestones) currently have to discover and execute a multi-step manual sequence:

1. `npm init -y` in a new directory
2. `npm install --save-dev @refrakt-md/cli @refrakt-md/plan`
3. `npx refrakt plan init plan`
4. Optionally configure `.claude/settings.json` hooks, wrapper scripts, and AI tool instruction files

Each of those steps is documented in isolation (root `CLAUDE.md`, `refrakt plan init --help`, plan package README), but there is no consolidated "here's how to start a planning-only project" path. Users arriving at `npx create-refrakt` see framework options and theme scaffolding — planning isn't represented at all.

This matters for three reasons:

- **Discovery** — planning is a compelling standalone use case. A repo can use refrakt's CLI to manage specs and work items without any commitment to the rendering/theme side of the ecosystem. Hiding that behind a manual setup flow understates the proposition.
- **Consistency** — sites have `--target` options, themes have `--type theme`. Planning-only usage deserves the same first-class surface.
- **Friction for AI-driven adoption** — AI agents pointed at refrakt for planning currently need to perform the multi-step setup themselves and get the details right (dev dep vs prod dep, `plan init` target directory, optional flags). A single command collapses that to one tool call.

-----

## Design Principles

**Planning-only is a distinct project type, not a site variant.** A planning project has no framework, no theme, no rendering pipeline — just a `plan/` directory and CLI commands that read/write it. This is a different kind of thing from a site, so it belongs under `--type`, not `--target`.

**Delegate to `refrakt plan init`, don't duplicate it.** The plan package already owns scaffolding logic (directory structure, example items, instruction files, optional Claude Code hook, optional wrapper script). `create-refrakt` should not reimplement any of that — it should produce a minimal `package.json`, install the CLI and plan package, and invoke the existing init command.

**Minimal dependencies.** A planning-only project should install `@refrakt-md/cli` and `@refrakt-md/plan` and nothing else. No `@refrakt-md/runes`, `@refrakt-md/transform`, `@refrakt-md/lumina`, or any framework adapter. The resulting `node_modules` should be as small as the ecosystem allows.

**Interactive prompt parity.** The existing interactive mode asks for project name and framework. When `--type plan` is selected (or offered as a choice), the framework prompt is skipped — there is no framework to choose.

-----

## Proposed CLI Surface

Add `plan` as a third value for `--type` in `create-refrakt`:

```bash
# Non-interactive
npx create-refrakt my-plan --type plan

# Interactive — "Planning only" appears as a choice alongside "Site" and "Theme"
npx create-refrakt my-plan
```

Usage output becomes:

```
Usage: create-refrakt [name] [options]

Options:
  --type <site|theme|plan>     What to create (default: site)
  --target <target>            Adapter target (sites only, default: sveltekit)
  --theme, -t <package>        Theme package (sites only, default: @refrakt-md/lumina)
  --scope, -s <scope>          npm scope (themes only)
  --help, -h                   Show this help message

Examples:
  npx create-refrakt my-plan --type plan
  npx create-refrakt my-site --target astro
  npx create-refrakt my-theme --type theme
```

When `--type plan` is set, `--target`, `--theme`, and `--scope` are rejected with a clear error message.

### Interactive flow

When no `--type` is supplied and stdout is a TTY, the first prompt becomes:

```
? What do you want to create?
  › Site — full refrakt.md site with a framework adapter
    Theme — a publishable theme package
    Planning only — specs, work items, decisions, milestones
```

If the user chooses "Planning only", the framework prompt is skipped.

-----

## Scaffold Output

Running `npx create-refrakt my-plan --type plan` in an empty working directory should produce the following:

```
my-plan/
  package.json
  .gitignore
  plan/
    INSTRUCTIONS.md
    AGENTS.md
    specs/
      SPEC-001-example.md
    work/
      WORK-001-example.md
    decisions/
      ADR-001-example.md
    milestones/
      v0.1.0.md
    index.md
```

### package.json contents

```json
{
  "name": "my-plan",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "plan": "refrakt plan",
    "plan:next": "refrakt plan next",
    "plan:status": "refrakt plan status",
    "plan:validate": "refrakt plan validate"
  },
  "devDependencies": {
    "@refrakt-md/cli": "<current>",
    "@refrakt-md/plan": "<current>"
  }
}
```

Dependency versions are derived from `create-refrakt`'s own `package.json` at runtime (same pattern used for site scaffolds today — see `packages/create-refrakt/src/scaffold.ts`).

### No top-level README

The scaffold does not create a `README.md` at the project root. `refrakt plan init` already writes `plan/INSTRUCTIONS.md` (human-facing workflow guide) and `plan/AGENTS.md` (agent-facing instructions) inside the plan directory that owns all the real content. A second doc file at the repo root would duplicate that and read awkwardly next to a `plan/` folder that isn't the repo itself. Users who want a root README can add one manually — the scaffold shouldn't impose one.

### Scripts rationale

The `npm run plan*` aliases give users a discoverable verb surface without requiring them to remember `npx refrakt plan ...`. Agents invoking the CLI directly can still use `npx refrakt plan ...`.

### Delegating to `refrakt plan init`

After writing `package.json` and `.gitignore`, the scaffold runs `refrakt plan init plan` in the new project directory. This produces the `plan/` tree, `INSTRUCTIONS.md`, `AGENTS.md`, and example content.

Two implementation options:

1. **Shell out after install** — create-refrakt finishes scaffolding `package.json`, runs `npm install`, then invokes `npx refrakt plan init plan`. Simple but slow (two `npm install` roundtrips if the user re-runs init).
2. **Import the init logic directly** — add `@refrakt-md/plan` as a dependency of `create-refrakt` and call the init function programmatically. Faster and more coherent, but couples `create-refrakt`'s release cadence to the plan package.

Option 2 is preferred because `create-refrakt`'s existing site scaffold already depends on `@refrakt-md/runes` and `@refrakt-md/transform` for config generation — adding `@refrakt-md/plan` is consistent with that pattern, and the packages are released together via fixed-mode Changesets anyway.

### Agent instruction files

`refrakt plan init` already handles writing `AGENTS.md` and appending to per-tool instruction files. `create-refrakt --type plan` should not duplicate this logic — it should pass through any relevant flags to the init step.

Forward these flags to `refrakt plan init` if supplied:

- `--agent <tool>` — which AI tool instruction file to append to (claude, cursor, copilot, etc.)
- `--no-claude-hook` — skip `.claude/settings.json` SessionStart hook
- `--no-wrapper` — skip `plan.sh` wrapper script

These are not required for v1 — the defaults from `plan init` are sensible.

-----

## Completion Message

After scaffolding, print:

```
Done! Your refrakt.md planning project is ready.

Next steps:

  cd my-plan
  npm install
  npx refrakt plan next

Useful commands:

  npm run plan:status     See an overview of all plan items
  npm run plan:next       Find the next ready work item
  npx refrakt plan create work --title "..."
  npx refrakt plan update <id> --status in-progress

Documentation: https://refrakt.md/docs/plan
```

-----

## Out of Scope

- **Migration from an existing `plan/` directory** — `create-refrakt` always operates on an empty or new directory. Users with pre-existing plan content should run `refrakt plan init` manually (or use the deferred `refrakt plan import` proposed in SPEC-039).
- **Adding planning to an existing site** — if a user already ran `create-refrakt my-site`, they can add planning by running `npm install --save-dev @refrakt-md/plan && npx refrakt plan init plan`. Supporting "augment existing project" via `create-refrakt` itself is not in scope.
- **A standalone `create-refrakt-plan` binary** — adding a separate bin entry adds packaging and discovery overhead without clear benefit. `--type plan` on the existing bin is sufficient.
- **Plan-aware site scaffolding** — sites that want a rendered planning dashboard (e.g., the dogfood case) should compose the pieces manually. That's a distinct, advanced use case and doesn't belong in the quickstart.

-----

## Open Questions

- Should `create-refrakt --type plan` install `@refrakt-md/plan` as a `devDependency` or a regular `dependency`? The CLI package is always a devDependency; plan is similar in that it's only used at author time. Leaning devDependency for consistency.
- Should the scaffold initialize a git repo? The existing site scaffolds do not. Match existing behavior — leave git init to the user.
- Does SPEC-039 ("Plan Package Onboarding & Conventions Review") overlap with this? It covers init-time UX inside the plan package itself (tool-agnostic instruction files, folder naming, import). This spec is purely about the `create-refrakt` entry point delegating to that init. The two are complementary: improvements to `plan init` flow through automatically to `create-refrakt --type plan`.

-----

## Acceptance Criteria

- `npx create-refrakt my-plan --type plan` scaffolds a new directory containing a minimal `package.json`, `.gitignore`, and the full `plan/` tree produced by `refrakt plan init`.
- The scaffolded `package.json` lists only `@refrakt-md/cli` and `@refrakt-md/plan` under `devDependencies` — no site-related packages.
- Running `npm install` and `npx refrakt plan next` in the scaffolded project succeeds and prints the example work item.
- `npx create-refrakt` interactive mode offers "Planning only" as a third choice alongside "Site" and "Theme", and skips the framework prompt when chosen.
- `--type plan` combined with `--target`, `--theme`, or `--scope` produces a clear error and exits non-zero.
- `create-refrakt --help` documents the `plan` value for `--type` with an example.
- Completion message documents `plan next`, `plan status`, and a link to plan docs.
- Tests cover: non-interactive scaffold output, rejection of incompatible flag combinations, generated `package.json` shape.

{% /spec %}
