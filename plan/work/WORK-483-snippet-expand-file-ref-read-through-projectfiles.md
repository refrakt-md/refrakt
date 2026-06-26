{% work id="WORK-483" status="ready" priority="high" complexity="moderate" source="SPEC-113" milestone="v0.27.0" tags="content,runes,pipeline,snippet" %}

# snippet / expand / file-ref readers delegate I/O to `ProjectFiles`

Close the main gap in {% ref "SPEC-113" /%}: `read-file.ts` (and the snippet/expand/file-ref
pipelines) call `node:fs` directly today, bypassing the injectable seam — so tree mode is not
actually fs-free for snippets. Delegate the I/O to the {% ref "WORK-481" /%} provider, keeping
line-slicing and diagnostics intact.

## Scope

- **`read-file.ts`** — keep `readSnippetFile`/`readWholeSandboxedFile` line-slicing, range parsing, and structured diagnostics; replace the `node:fs` reads (`statSync`/`readFileSync`/`realpathSync`) with `ProjectFiles` calls. The containment logic moves into `fsProjectFiles` ({% ref "WORK-481" /%}), so this module stops re-implementing it.
- **Consumers** — `snippet-pipeline.ts`, `expand-pipeline.ts`, `file-ref-resolve.ts` obtain the provider from the preprocess context rather than importing fs-bound readers.
- **Tests** — the existing snippet/expand sandbox test suites pass against both `fsProjectFiles` and `memoryProjectFiles`.

## Acceptance Criteria

- [ ] snippet / expand / file-ref readers delegate I/O to the provider; line-slicing and diagnostics are unchanged.
- [ ] Their existing sandbox tests pass against both providers; a snippet resolves in pure `memoryProjectFiles` mode (no fs access).
- [ ] `read-file.ts` no longer re-implements path containment (that now lives in `fsProjectFiles`).

## Dependencies

- {% ref "WORK-481" /%} — the provider (incl. promoted containment).

## References

- {% ref "SPEC-113" /%} §3 (snippet/expand/file-ref) — `packages/runes/src/{snippet-pipeline,expand-pipeline,file-ref-resolve}.ts`, `packages/runes/src/lib/read-file.ts`.

{% /work %}
