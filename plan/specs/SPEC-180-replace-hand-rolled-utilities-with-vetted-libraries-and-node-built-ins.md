{% spec id="SPEC-180" status="draft" tags="dependencies, security, cli, tooling, maintenance" %}

# Replace hand-rolled utilities with vetted libraries and Node built-ins

refrakt has very few third-party dependencies: outside `@refrakt-md/*`, most packages depend
only on `@markdoc/markdoc` and `yaml`. That is mostly a strength, and several hand-rolled
modules are deliberate and documented (the semver subset in `types/src/compat.ts`, the RFC 4180
reader in `runes/src/data-adapters.ts`, the SVG chart renderer). This spec covers the few where
the hand-rolled version is measurably worse than an existing library or a Node built-in, and says
which of the rest stay.

## Problem

### The sandbox sanitiser is regex-based, and most known bypasses get through

`packages/runes/src/lib/sanitize.ts` is the defence-in-depth pass for `sandbox` content in
`untrusted` mode with `allowJs: false`. It strips `<script>` blocks, `on*=` attributes, quoted
`javascript:` URLs and `<iframe>`/`<object>`/`<embed>`, all with regular expressions. Run
against eight standard payloads, six come out unchanged or still executable:

| Input | Output |
|---|---|
| `<a href="jav&#x61;script:alert(1)">` | unchanged (the entity hides the scheme) |
| `<a href=javascript:alert(1)>` | unchanged (the URL rule requires quotes) |
| `<scr<script></script>ipt>alert(1)</script>` | `<script>alert(1)</script>` (removing the inner tag reassembles the outer one) |
| `<meta http-equiv="refresh" content="0;url=javascript:…">` | unchanged |
| `<img src=x/onerror=alert(1)>` | unchanged (`/` as an attribute separator) |
| `<svg><animate attributeName="href" values="javascript:…"/>` | unchanged |

These do not currently lead to script execution. The untrusted iframe gets
`sandbox="allow-scripts"` without `allow-same-origin`, and a meta-CSP with `script-src 'none'`
(`behaviors/src/elements/sandbox.ts`). Those two layers do the actual work. But the sanitiser is
documented as a third layer, and against these inputs it provides almost no protection.
Regex sanitisers fail this way by construction: HTML has to be parsed, not pattern-matched,
before you can decide what to remove.

### CLI flags are parsed by hand, 27 times

These files parse `argv` with hand-written `for (let i…)` loops and `args[++i]` look-ahead:

| File | Loops |
|---|---|
| `packages/cli/src/bin.ts` | 12 |
| `plugins/plan/src/cli-plugin.ts` | 9 |
| `packages/cli/src/commands/plugins.ts` | 2 |
| `packages/cli/src/commands/config.ts` | 2 |
| `packages/create-refrakt/src/bin.ts` | 1 |
| `plugins/docs/src/cli-plugin.ts` | 1 |

`packages/mcp/src/bin.ts` declares its own function named `parseArgs`. Each loop decides for
itself whether to support `--flag=value`, what an unknown flag does, and what message a missing
value gets. The answers differ from command to command. This is the largest single block of
code in `bin.ts` (about 2,000 lines). Node has shipped `util.parseArgs` since 18.3 (stable in 20),
and it needs no dependency.

### Smaller cases

- **`packages/runes/src/lib/line-diff.ts`** builds a full LCS table, which uses O(m·n) memory: two
  5,000-line inputs allocate 25 million cells. It is used by the `diff` rune
  (`tags/diff.ts:257`) and by `refrakt snippet review`. `diff` (jsdiff) implements Myers' O(ND)
  algorithm, which is the standard answer here.
- **`globToRegExp` in `packages/content/src/edges/exclude.ts`** implements `*`, `**`, `?` and a
  trailing `/` for path globs. That is the right subset, but path-glob edge cases (`**` at the
  start of a pattern, character classes, dot-files) are what `picomatch` already gets right. The
  `*`-only glob in `runes/src/field-match.ts` matches field values, not paths, and is out of
  scope.

## Decisions

### D1 — The sanitiser parses before it removes

The replacement works on a parsed tree, never on the raw string, and keeps today's policy:
denylist, not allowlist. Sandbox content is arbitrary demo HTML and CSS, so an allowlist profile
would strip the legitimate content the rune exists to show. The candidate is DOMPurify,
configured to:

- keep `<style>`, custom elements and whole documents;
- forbid `script`, `iframe`, `object`, `embed`, `base` and `meta[http-equiv]`;
- reject `javascript:`, `vbscript:` and `data:text/html` URLs after decoding entities.

It needs a DOM on the server. `sanitize-html` (htmlparser2) is the alternative that does not.
The choice is open question Q1.

The sanitiser runs in the schema transform, which the editor bundles for the browser, so the
dependency must work in both environments or load lazily, server-side only.

The sandbox's iframe and CSP layers are unchanged. This spec strengthens the third layer; it
does not replace the first two.

### D2 — `util.parseArgs`, behind one thin helper

Every command declares its options once and parses with `util.parseArgs`:
`strict: true` for commands with a fixed flag set, `tokens: true` for the two with open-ended
flags:

- `refrakt inspect <rune> --<attr>=<value>`;
- `refrakt plan update <id> --<attr> <value>`.

Under `strict: false`, `--attr value` parses as a boolean flag plus a positional. That is the one
trap here, so a small shared helper turns `parseArgs` tokens into the `Record<string, string>`
those commands expect today.

The usage and error messages stay as they are. The point is consistent parsing, not new wording.

All published `bin` packages declare `"engines": { "node": ">=20" }`. None declares an engine
today.

### D3 — `diff` and `picomatch` are adopted only if they pass a measurement

For line diffs: replace `computeLineDiff`'s internals with `diffLines` from `diff`, keep its
`DiffHunk[]` return shape, and keep `summarizeDiff` unchanged. For globs: back `globToRegExp`
with `picomatch.makeRe` and keep the documented subset. No brace expansion and no negation
(`exclude.ts` gives the reasons), so those features are turned off in the picomatch options.

Both are optional. Each lands only if its existing tests pass unchanged. For `diff`, the
`diff` rune's rendered output must also be byte-identical on `site/content`.

### D4 — What stays hand-rolled

Kept deliberately:

- `types/src/compat.ts`: `@refrakt-md/types` is meant to have no dependencies, and the comment
  there gives the reason.
- the CSV/TSV reader;
- the SVG chart renderer, which is bound to the `--rf-chart-*` theming contract;
- the CDN-loaded Leaflet and Mermaid, which are already outsourced.

**Levenshtein** exists five times, as do several other helpers. That is consolidation, not
outsourcing, and is out of scope here (see Non-goals).

## Non-goals

- Consolidating duplicated internal helpers (Levenshtein ×5, `escapeHtml` ×6, kebab-case ×3
  algorithms, git wrappers, tree walkers). That needs its own spec, because several copies have
  drifted into different behaviour and each needs a decision about which behaviour is correct.
- Changing the sandbox's iframe or CSP layers.
- New CLI flags or renamed flags.

## Acceptance Criteria

- [ ] `sanitizeSandboxContent` parses its input before removing anything, and keeps its exported signature
- [ ] A regression test feeds the sanitiser the six bypass payloads from this spec and asserts that none survives
- [ ] Existing `sandbox` tests and demos in `site/content` render unchanged in `trusted` mode
- [ ] Every hand-rolled argv loop in `packages/cli`, `plugins/plan`, `plugins/docs` and `create-refrakt` uses `util.parseArgs`
- [ ] `refrakt inspect <rune> --<attr>=<value>` and `refrakt plan update <id> --<attr> <value>` accept the same input they accept today
- [ ] Published `bin` packages declare `engines.node >= 20`
- [ ] `computeLineDiff` and `globToRegExp` are either replaced per D3, or kept, with the measurement that decided it recorded in the work item's resolution

## Open questions

- **Q1. DOMPurify or sanitize-html?** DOMPurify has the best bypass track record, but on the
  server it needs `jsdom` (heavy) or a lighter DOM (`happy-dom`, `linkedom`; check that DOMPurify
  supports it). `sanitize-html` needs no DOM, but it is built around allowlists, so a denylist
  configuration fights its defaults. A decision needs bundle size in the editor, install size for
  `@refrakt-md/runes`, and the bypass suite run against both.
- **Q2.** Should the sanitiser move out of `@refrakt-md/runes` into a server-only entry point,
  so the browser bundle never carries it? The editor's in-browser preview would then show
  unsanitised `untrusted` content, which the iframe and CSP layers still contain.

## References

- `packages/runes/src/lib/sanitize.ts`, `packages/runes/src/tags/sandbox.ts`,
  `packages/behaviors/src/elements/sandbox.ts`
- `packages/cli/src/bin.ts`, `plugins/plan/src/cli-plugin.ts`
- `packages/runes/src/lib/line-diff.ts`, `packages/content/src/edges/exclude.ts`

{% /spec %}
