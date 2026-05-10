---
title: Security Policy
description: Configuring the transform pipeline to render untrusted author content safely.
---

# Security Policy

The transform pipeline is designed for self-hosted single-author projects: by default it assumes content is **trusted** and renders author HTML, CSS, and JavaScript as written. That's the right default for most documentation sites — but it's unsafe for any **hosted product** that renders content from one tenant in another tenant's session.

The {% ref "Sandbox" %} rune in particular ships authored HTML/CSS/JS into an iframe with `sandbox="allow-scripts allow-same-origin"`. With `allow-same-origin` set on a `srcdoc` iframe the browser inherits the parent's origin, which means a malicious `<script>` inside the sandbox can read the parent page's cookies, `localStorage`, and DOM. Fine for a personal docs site you wrote yourself; not fine for a multi-tenant SaaS.

The `security` option on the SvelteKit Vite plugin (and `loadContent`'s `securityPolicy` parameter) opts in to layered defences without changing behaviour for self-hosted users.

## The three tiers

Each tier closes more of the attack surface and depends on more of the host. Pick the highest tier you can support.

### Tier 1 — sanitisation, no JS

```ts
// vite.config.ts
import { refrakt } from '@refrakt-md/sveltekit';

export default {
  plugins: [refrakt({ security: 'strict' })],
};
```

`'strict'` is sugar for `{ trust: 'untrusted', allowJs: false }`. Before content reaches the iframe, the schema transform strips:

- `<script>` blocks (including those nested inside SVG)
- `on*=` event-handler attributes (quoted, unquoted, and SVG forms)
- `javascript:` URLs in `href`/`src`/`action`/`formaction`/`xlink:href`
- `<iframe>`, `<object>`, and `<embed>` tags

The iframe is also rebuilt with `sandbox="allow-scripts"` only — `allow-same-origin` is dropped, so any code that slips through the sanitiser still runs in a unique opaque origin and can't touch parent state. A persistent visual banner is rendered above the iframe (outside the iframe, in the host element's DOM) so visitors can see the content is sandboxed.

This is the only tier that ships a hard guarantee from the package alone. It's the realistic default for hosted-product use cases where authored JavaScript is not part of the value proposition.

### Tier 2 — JS allowed, srcdoc + meta-CSP

```ts
refrakt({
  security: { trust: 'untrusted', allowJs: true },
});
```

When you genuinely need authored scripts to run (for example, an interactive demo platform), set `allowJs: true`. Scripts are no longer stripped; instead the iframe is hardened by:

1. Dropping `allow-same-origin` from the iframe sandbox attribute (same as Tier 1).
2. Injecting a meta-CSP as the very first child of the iframe's `<head>`:
   ```
   default-src 'none';
   script-src 'unsafe-inline' <permitted-cdns>;
   style-src 'unsafe-inline' <permitted-cdns>;
   font-src data: https://fonts.gstatic.com <permitted-cdns>;
   img-src data: <permitted-cdns>;
   connect-src 'none';
   form-action 'none';
   base-uri 'none';
   frame-src 'none';
   object-src 'none';
   ```

`<permitted-cdns>` is derived from the framework preset (Tailwind/Bootstrap/Bulma/Pico) and any explicit `dependencies=` URLs the author listed, so existing sandboxes keep working.

**What this closes:** parent-origin attacks (already closed by Tier 1), data exfiltration via `fetch`/`XHR`/`WebSocket` (`connect-src 'none'`), off-site form submissions (`form-action 'none'`), tracking pixels (`img-src` limited to data URLs and permitted origins), external script loads outside the permitted CDN list.

**What it does not close:** in-iframe phishing (the UX banner is still your last line of defence), fingerprinting (`canvas`/`audio`/`navigator` APIs all work), CPU abuse / cryptojacking, browser-exploit chains in the JS engine itself.

**Caveats:** meta-CSP must be the first child of `<head>` or browsers ignore it. It also can't deliver `frame-ancestors` or `report-uri` — those need response headers, which is what Tier 3 is for.

### Tier 3 — separate origin with response-header CSP

```ts
refrakt({
  security: {
    trust: 'untrusted',
    allowJs: true,
    sandboxOrigin: 'https://sandbox.example.com',
  },
});
```

When `sandboxOrigin` is set, the `<rf-sandbox>` element loads the iframe from `${sandboxOrigin}/render?...` instead of using `srcdoc`. Content is delivered to the iframe via `postMessage` after it announces itself with a `rf-sandbox-ready` message.

**This is the only tier that gets you real CSP response headers**, cross-origin browser protections, and `frame-ancestors`/`report-uri`. The cost is that you now have to operate the endpoint.

#### Endpoint contract

The host endpoint at `${sandboxOrigin}/render`:

1. Accepts `GET /render?framework=…&dependencies=…&theme=…&height=…`.
2. Responds with HTML containing the same scaffolding `buildSrcdoc` produces (theme classes, dependency tags, resize observer) plus a script that posts `{ type: 'rf-sandbox-ready' }` to `parent`.
3. Listens for `{ type: 'rf-sandbox-content', content, tokens }` from the parent and inserts the content into the body.
4. Sends real CSP response headers — at minimum the same directives the meta-CSP uses, plus `frame-ancestors <your-app-origin>` and a `report-uri` if you want telemetry.

A reference implementation isn't shipped with the package; it's deliberately a host integration point.

## What's still residual

Even with Tier 3 + UX banner, **fingerprinting and CPU abuse remain accepted residual risks** if you allow JavaScript at all. Browser APIs like canvas, audio, and `navigator` are not gated by CSP. The only complete fix is "don't run author JS." For most hosted products the realistic policy is: Tier 1 default, opt-in Tier 2/3 per-page or per-account.

## API shape

```ts
import type { SecurityPolicy } from '@refrakt-md/types';

type SecurityPolicy =
  | 'trusted'                     // default; full power, no sanitisation
  | 'strict'                      // sugar for { trust: 'untrusted', allowJs: false }
  | {
      trust: 'untrusted';
      allowJs?: boolean;          // default false
      sandboxOrigin?: string;     // enables Tier 3 when set
    };
```

The string presets exist because the common cases — "I'm self-hosting" and "this is hosted, no JS" — should be one short string. The object form is for the niche "I need JS in untrusted content" cases.

## What changes for self-hosted users

Nothing. The default is `'trusted'` and matches today's behaviour exactly: no sanitisation, iframe gets `allow-scripts allow-same-origin`, no banner. If you don't set `security` you don't see any change.

One nuance worth flagging: `untrusted` mode loses `allow-same-origin`, which means iframes can't share fonts/storage/cookies with the parent. That's correct for the threat model, but it's an observable behaviour change for anything that was relying on the cross-context sharing. Tests and demos that use sandbox to call into the parent page won't work in `'strict'` mode.

## Plugin authors

Plugins that surface raw author content to the client should read `config.variables.__securityPolicy` from their schema transform and route content through the shared `sanitizeSandboxContent` helper. See [Plugin Authoring → Honouring the security policy](/docs/plugins/authoring) for the contract.
