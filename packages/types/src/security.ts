/** Security policy controlling how the transform pipeline treats untrusted
 *  author content (sandbox HTML/CSS/JS, etc.).
 *
 *  Use the string presets for the common cases:
 *  - `'trusted'`   — current default; full power, no sanitisation, sandbox iframes get
 *                    `allow-scripts allow-same-origin`. Self-hosted single-author projects.
 *  - `'strict'`    — sugar for `{ trust: 'untrusted', allowJs: false }`. Hosted-product
 *                    default: scripts and event handlers stripped; only HTML/CSS rendered.
 *
 *  Use the object form when you need to allow JS in untrusted mode:
 *  - `allowJs: true`     — keep author scripts but harden the iframe (drop
 *                          `allow-same-origin`, inject meta-CSP). Fingerprinting and
 *                          cryptojacking remain accepted residual risks.
 *  - `sandboxOrigin`     — host-provided URL (e.g. `https://sandbox.example.com`).
 *                          Sandbox iframes load from this origin instead of `srcdoc`,
 *                          enabling real CSP response headers and cross-origin browser
 *                          protections. Falls back to srcdoc + meta-CSP when unset.
 */
export type SecurityPolicy =
  | 'trusted'
  | 'strict'
  | {
      trust: 'untrusted';
      /** Allow author `<script>` blocks and event-handler attributes through.
       *  Default `false` — scripts are stripped before they reach the iframe. */
      allowJs?: boolean;
      /** When set, sandbox iframes load from this origin instead of `srcdoc`.
       *  The host must serve sandbox content from this origin with appropriate
       *  CSP headers — see docs/security for the endpoint contract. */
      sandboxOrigin?: string;
    };

/** Internal resolved form of `SecurityPolicy` after preset expansion. */
export interface ResolvedSecurityPolicy {
  trust: 'trusted' | 'untrusted';
  allowJs: boolean;
  sandboxOrigin: string | undefined;
}

/** Expand the `SecurityPolicy` shorthand into its canonical resolved form.
 *  Centralised so every consumer reads the same defaults. */
export function resolveSecurityPolicy(policy: SecurityPolicy | undefined): ResolvedSecurityPolicy {
  if (policy === undefined || policy === 'trusted') {
    return { trust: 'trusted', allowJs: true, sandboxOrigin: undefined };
  }
  if (policy === 'strict') {
    return { trust: 'untrusted', allowJs: false, sandboxOrigin: undefined };
  }
  return {
    trust: 'untrusted',
    allowJs: policy.allowJs ?? false,
    sandboxOrigin: policy.sandboxOrigin,
  };
}
