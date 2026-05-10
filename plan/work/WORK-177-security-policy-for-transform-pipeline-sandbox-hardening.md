{% work id="WORK-177" status="ready" priority="high" complexity="moderate" tags="security, sandbox, transform, plugins" milestone="v0.12.0" %}

# Security policy for transform pipeline (sandbox hardening)

Today the transform pipeline assumes its input is trusted. The `sandbox` rune in particular concatenates author HTML/CSS/JS into a `srcdoc` iframe with `sandbox="allow-scripts allow-same-origin"` (`packages/behaviors/src/elements/sandbox.ts:127`), which gives author scripts the parent origin's cookies, `localStorage`, and DOM. That's fine for self-hosted single-author projects but unsafe for any hosted product surface that renders content from one tenant in another tenant's session.

Add an opt-in `security` policy on the pipeline so hosts can render untrusted content with layered defences (sanitisation, CSP, iframe sandbox, optional separate origin) without breaking the trusted-default behaviour self-hosted users rely on.

## Acceptance Criteria

### Policy shape and propagation

- [ ] Add `SecurityPolicy` type to `@refrakt-md/types` with the union shape: `'trusted' | 'strict' | { trust: 'untrusted', allowJs?: boolean, sandboxOrigin?: string }`. Bare strings are presets that expand to the object form (`'trusted'` → today's behaviour; `'strict'` → `{ trust: 'untrusted', allowJs: false }`).
- [ ] `loadContent()` in `packages/content/src/site.ts` accepts a `securityPolicy?: SecurityPolicy` option and propagates it as `__securityPolicy` on `contentVariables` (matching the existing `__sandboxReadFile` pattern at `site.ts:135-147`).
- [ ] SvelteKit Vite plugin (`packages/sveltekit/src/plugin.ts`) surfaces the option so consumers can wire it from `vite.config.ts` / `refrakt.config.json`.
- [ ] Default remains `'trusted'` (no behaviour change for existing self-hosted users).

### Tier 1 — no-JS sanitisation (in-package, ships standalone)

- [ ] New `packages/runes/src/lib/sanitize.ts` exposes `sanitizeSandboxContent(rawContent, policy)` that, for `allowJs: false`, strips `<script>` blocks, `on*` event-handler attributes, `javascript:` URLs in `href`/`src`/`action`, and `<iframe>`/`<object>`/`<embed>` tags. Reusable from any rune that handles raw author HTML.
- [ ] `packages/runes/src/tags/sandbox.ts` reads `config.variables.__securityPolicy` immediately before line 116 (where `contentMeta` is created), runs the sanitiser, and emits an additional `securityMode` meta tag carrying the resolved trust + allowJs values.
- [ ] Sandbox `postTransform` in `packages/runes/src/config.ts:735-781` reads the `securityMode` meta and stamps `data-security-mode` (and, when set, `data-sandbox-origin`) on the `<rf-sandbox>` element.
- [ ] Tests in `packages/runes/test/sandbox.test.ts` cover: trusted (no change), strict (scripts and on-handlers removed), strict-with-svg-files (scripts inside SVG also stripped), and verify `data-security-mode` lands on the rendered element.

### Tier 2 — srcdoc + meta-CSP + strict sandbox attr (JS allowed, in-package)

- [ ] `packages/behaviors/src/elements/sandbox.ts:127` reads `this.dataset.securityMode`. When `untrusted`, the iframe `sandbox` attribute is `allow-scripts` only (drops `allow-same-origin`); when `trusted`, current behaviour is preserved.
- [ ] When `untrusted` and `allowJs` is true, `buildSrcdoc` in the same file injects a CSP meta tag as the very first child of `<head>`: `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none';">`. Tighten the sources further if the framework preset / dependency lists need additional origins, and document those exceptions.
- [ ] Document the meta-CSP caveats inline (must be first in `<head>`; ignored if anything precedes it; can't deliver `frame-ancestors` / `report-uri`) so a future maintainer doesn't reorder the srcdoc and silently break enforcement.

### Tier 3 — separate-origin escape hatch (host-provided)

- [ ] When `sandboxOrigin` is set on the policy, `<rf-sandbox>` builds the iframe with `iframe.src = ${sandboxOrigin}/render?token=…` instead of `srcdoc`, passing the content via `postMessage` after the iframe loads (or via a one-shot fetch the host endpoint serves with real CSP response headers — pick one and document it).
- [ ] When `sandboxOrigin` is unset, fall back to Tier 2 srcdoc + meta-CSP. The package can't host a separate origin itself; this is an integration point for hosted deployments.
- [ ] Document the host-side requirements (endpoint contract, CSP headers it must send, expected request shape) in `site/content/docs/themes/` or a new `site/content/docs/security/` page.

### Plugin extensibility

- [ ] Plugins authoring risky runes opt in to security enforcement by reading `config.variables.__securityPolicy` from their schema transform — same channel used here. No new core hook needed; the engine itself stays security-agnostic (it's structural).
- [ ] Document the plugin contract in `site/content/docs/plugins/authoring.md`: which `config.variables` slot to read, the policy shape, when to sanitise vs reject, and a reference to the shared sanitiser utility.

### UX affordance

- [ ] In untrusted mode the host element renders a non-removable visual marker (thin banner or border + "Sandboxed user content" label) **outside** the iframe so author code can't suppress it. Style hook in `packages/lumina/styles/runes/sandbox.css`. Cuts phishing risk significantly even when JS is allowed; orthogonal to the iframe-attribute layer.

### Documentation

- [ ] New `site/content/docs/security/` (or section in an existing docs page) walks through the three tiers, what each does and doesn't protect against (use the threat list from the design discussion: phishing, fingerprinting, cryptojacking, exfiltration, browser-exploit chains), and the host-infra requirements for Tier 3.
- [ ] Note explicitly that `untrusted` mode loses `allow-same-origin`, which means sandboxed iframes can't share fonts/storage/etc. with the parent — observable behaviour change worth flagging.

## Approach

Order matters because each tier builds on the previous one and ships meaningful safety on its own:

1. **Type + plumbing first.** Land `SecurityPolicy`, `__securityPolicy` propagation, the default `'trusted'` shape, and a no-op sanitiser that just returns input. Verify nothing changes for self-hosted users and the option threads end-to-end.
2. **Tier 1 sanitiser.** Implement `sanitizeSandboxContent` and the `allowJs: false` path. This is the only mode that ships a hard guarantee without host cooperation, so it's the realistic default for the hosted product.
3. **Tier 2 iframe-attribute + meta-CSP.** Update `RfSandbox` client code. This is the "JS allowed but constrained" middle tier. Most of the value is in the CSP — the sandbox-attribute change is strict-mode hygiene, not the primary control.
4. **UX banner.** Cheap, orthogonal, the single biggest mitigation against phishing for any tier where JS runs. Worth shipping early.
5. **Tier 3 separate-origin.** Last because it requires host infrastructure decisions (endpoint contract, deployment) that go beyond the package. Document the integration; don't try to provide a default endpoint.
6. **Plugin contract docs + security docs page.** Ship alongside the implementation so consumers know which knob to turn.

## Context

The shape and tier breakdown came out of a design discussion that examined the `sandbox` rune's data flow end-to-end (`packages/runes/src/tags/sandbox.ts` schema transform → `config.ts:735-781` postTransform → `Renderer.svelte` HTML escape → `behaviors/src/elements/sandbox.ts` iframe construction). Key conclusions:

- The actual XSS surface today is the iframe's `allow-same-origin` flag, not the HTML serialisation path — the renderer escapes attributes correctly and `<template>` is inert.
- Removing `allow-same-origin` closes parent-origin attacks (cookie theft, storage abuse, parent-DOM access) but does **not** close phishing, fingerprinting, cryptojacking, or external-resource exfiltration when JS is allowed. Those need CSP and ideally a separate origin.
- For `srcdoc` iframes there is no HTTP response, so CSP must be set via `<meta http-equiv>`. Meta-CSP supports most directives we need (`connect-src`, `form-action`, `img-src`, `script-src`) but not `frame-ancestors` or `report-uri`. Tier 3 with a real endpoint is the only way to get header CSP.
- "Trust" is genuinely binary on the input axis — `'trusted' | 'strict' | { … }` is more readable at call sites than a boolean and leaves room for the object form to grow `allowJs` / `sandboxOrigin` / future overrides without changing the discriminator.

## Dependencies

None blocking. Builds on the existing `config.variables` extension pattern (sandbox file readers, icon registry).

## References

- `packages/runes/src/tags/sandbox.ts` — schema transform; sanitiser hooks in here.
- `packages/runes/src/sandbox-sources.ts` — directory-based source assembly; same content path.
- `packages/runes/src/config.ts:735-781` — sandbox `postTransform`; reads security meta and stamps data attrs.
- `packages/behaviors/src/elements/sandbox.ts:52,127` — client iframe construction; sandbox attribute and srcdoc CSP land here.
- `packages/content/src/site.ts:94-147` — `loadContent` entry point; new option threads through here.
- `packages/sveltekit/src/plugin.ts` — surfaces the policy to consumers.
- `packages/types/src/` — `SecurityPolicy` type definition.
- Prior art: Glitch and CodeSandbox both serve user-rendered code from a separate origin and overlay a persistent "sandboxed" UI affordance.

{% /work %}
