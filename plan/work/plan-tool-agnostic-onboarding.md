{% work id="WORK-142" status="ready" priority="medium" complexity="moderate" source="SPEC-039" tags="plan, cli, onboarding, dx" %}

# Make plan init tool-agnostic

`refrakt plan init` currently hardcodes writing workflow instructions to `CLAUDE.md`. Decouple the init command from any specific AI tool so the plan package works naturally for users of Cursor, GitHub Copilot, Windsurf, Cline, Aider, or no AI tool at all.

## Acceptance Criteria

- [ ] `plan init` generates a standalone `plan/INSTRUCTIONS.md` containing the full workflow guide (CLI commands, ID conventions, status workflows, content structure)
- [ ] The generated instructions file contains no references to any specific AI tool
- [ ] `plan init --agent claude` appends a short pointer to `CLAUDE.md` referencing the instructions file
- [ ] `plan init --agent cursor` appends to `.cursorrules`
- [ ] `plan init --agent copilot` appends to `.github/copilot-instructions.md`
- [ ] `plan init --agent none` skips appending to any instruction file
- [ ] Default behavior (no `--agent` flag) auto-detects by checking which instruction files exist in the project root
- [ ] Auto-detect falls back to `CLAUDE.md` when no known instruction files are found
- [ ] The appended content is a short summary with a pointer to the full instructions file, not the full workflow docs
- [ ] Existing `plan/CLAUDE.md` content is migrated to the new `plan/INSTRUCTIONS.md` with Claude-specific framing removed
- [ ] `site/content/runes/plan/workflow.md` rewritten as general "AI assistant integration" guide (currently Claude Code-specific)
- [ ] `site/content/runes/plan/index.md` references to `CLAUDE.md` updated
- [ ] `site/content/runes/plan/cli.md` references to `CLAUDE.md` updated

## Approach

### Files to modify

- `runes/plan/src/commands/init.ts` — replace `WORKFLOW_SECTION` with a short pointer template; add `--agent` flag handling; generate `INSTRUCTIONS.md`
- `runes/plan/src/cli-plugin.ts` — wire `--agent` argument through to `handleInit`
- `runes/plan/src/commands/templates.ts` — may need a new template for the instructions file content

### Agent detection

Check for existence of these files in the project root (in order):
1. `CLAUDE.md`
2. `.cursorrules`
3. `.github/copilot-instructions.md`
4. `.windsurfrules`
5. `.clinerules`

Append to all that exist. If none exist, create `CLAUDE.md` for backwards compatibility.

### Pointer content

The appended snippet should be roughly:

```markdown
## Plan

Project planning content lives in `plan/` using `@refrakt-md/plan`. See `plan/INSTRUCTIONS.md` for the full workflow guide.

Quick start: `refrakt plan next` | `refrakt plan status` | `refrakt plan create work --title "..."`
```

## References

- {% ref "SPEC-039" /%} — parent spec

{% /work %}
