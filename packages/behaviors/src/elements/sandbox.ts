import { RfContext } from './context.js';
import type { DesignTokens } from './context.js';
import { readHiddenContent } from './helpers.js';

const FRAMEWORK_PRESETS: Record<string, string[]> = {
	tailwind: [
		'<script src="https://cdn.tailwindcss.com"><\/script>',
		'<script>tailwind.config = { darkMode: "class" }<\/script>',
	],
	bootstrap: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css">'],
	bulma: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1/css/bulma.min.css">'],
	pico: ['<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">'],
};

const ROLE_FALLBACKS: Record<string, string> = {
	heading: 'sans-serif',
	body: 'sans-serif',
	mono: 'monospace',
	display: 'sans-serif',
	caption: 'sans-serif',
};

/**
 * <rf-sandbox> — renders user HTML/CSS/JS in an isolated iframe.
 *
 * Reads content from <template data-content="source">, framework/dependencies
 * from data attributes, and design tokens + theme from RfContext.
 *
 * Features:
 * - Framework preset injection (Tailwind, Bootstrap, Bulma, Pico)
 * - Design token CSS custom properties
 * - Auto-sizing via ResizeObserver + postMessage
 * - Theme synchronization via iframe rebuild
 */
import { SafeHTMLElement } from './ssr-safe.js';

export class RfSandbox extends SafeHTMLElement {
	private iframe: HTMLIFrameElement | null = null;
	private messageHandler: ((e: MessageEvent) => void) | null = null;
	private themeCleanup: (() => void) | null = null;
	private ancestorObserver: MutationObserver | null = null;
	// WORK-381 — deferred activation. `_activation` is eager (mount now), visible
	// (mount on scroll-in) or click (mount on user action). The iframe and its
	// dependencies are not created until `activate()` runs, so a non-eager
	// sandbox downloads nothing early.
	private _activation: 'eager' | 'visible' | 'click' = 'eager';
	private _poster = '';
	private _activated = false;
	private _io: IntersectionObserver | null = null;
	// SPEC-104 — bg-layer backdrop: mount on-screen, suspend off-screen / on a
	// hidden tab, never mount under reduced motion (the bg boot frame stands in).
	private _backdrop = false;
	private _onScreen = false;
	private _visHandler: (() => void) | null = null;
	// Cached values for iframe rebuild on theme change
	private _content = '';
	private _framework = '';
	private _dependencies = '';
	private _label = 'Sandbox';
	private _heightAttr = 'auto';
	private _tokens: DesignTokens | null = null;
	private _localScheme: 'light' | 'dark' | null = null;
	// SPEC-093 — JSON payload from a data binding, exposed to the iframe as
	// window.RF_DATA. Empty for a non-data-bound sandbox.
	private _rfData = '';
	// Security state derived from data-* attributes set by the schema transform.
	// `_untrusted` drops `allow-same-origin` from the iframe sandbox attribute and
	// (when JS is allowed) injects a meta-CSP into srcdoc. `_sandboxOrigin`, when
	// set, switches the iframe from `srcdoc` to `src=<origin>/render?...` so the
	// host endpoint can serve real CSP response headers.
	private _untrusted = false;
	private _allowJs = true;
	private _sandboxOrigin = '';

	connectedCallback() {
		this._content = this.dataset.sourceContent || readHiddenContent(this, 'source');
		this._rfData = this.dataset.rfRecords || '';
		this._framework = this.dataset.framework || '';
		this._dependencies = this.dataset.dependencies || '';
		this._label = this.dataset.label || 'Sandbox';
		this._heightAttr = this.dataset.height || 'auto';
		this._untrusted = this.dataset.securityMode === 'untrusted';
		this._allowJs = this.dataset.allowJs !== 'false';
		this._sandboxOrigin = this.dataset.sandboxOrigin || '';
		const activation = this.dataset.activation;
		this._activation = activation === 'visible' || activation === 'click' ? activation : 'eager';
		this._poster = this.dataset.poster || '';

		// data-color-scheme is set by tint-mode and locks the sandbox to a
		// specific colour scheme, overriding the global RfContext.theme.
		this._localScheme = this.getAttribute('data-color-scheme') as 'light' | 'dark' | null;

		const tokensAttr = this.dataset.designTokens;
		this._tokens = tokensAttr ? JSON.parse(tokensAttr) : RfContext.designTokens;

		// SPEC-104 — a bg-layer backdrop overrides the activation modes: it mounts
		// only while on-screen and suspends off-screen / on a hidden tab, and never
		// mounts under reduced motion (the bg boot frame is the static stand-in).
		this._backdrop = this.dataset.guestPosture === 'backdrop';
		if (this._backdrop) {
			this.initBackdrop();
			return;
		}

		// Non-eager sandboxes show a poster and defer the iframe (and all its
		// dependency downloads) until activated — nothing loads early.
		if (this._activation !== 'eager') {
			this.renderPoster();
			return;
		}

		this.activate();
	}

	/** Resolve the colour scheme: tint-mode lock → nearest ancestor override →
	 *  global theme. Recomputed at activation time so a deferred sandbox picks up
	 *  the current theme. */
	private effectiveTheme(): 'light' | 'dark' | string {
		const ancestorScheme = !this._localScheme
			? (this.closest('[data-color-scheme]') as HTMLElement | null)?.getAttribute('data-color-scheme') as 'light' | 'dark' | null
			: null;
		return this._localScheme || ancestorScheme || RfContext.theme;
	}

	/** Build the iframe and wire theme synchronisation. Idempotent — the first
	 *  call (eager on connect, or on the activation trigger) does the work. */
	private activate() {
		if (this._activated) return;
		this._activated = true;
		// A backdrop keeps its observer alive so it can suspend again off-screen;
		// every other activation mode is one-shot and releases the observer.
		if (this._io && !this._backdrop) { this._io.disconnect(); this._io = null; }

		this.buildIframe(this.effectiveTheme());

		if (!this._localScheme) {
			// Subscribe to global theme changes, but only apply when no
			// ancestor colour scheme is active.
			this.themeCleanup = RfContext.onThemeChange((theme) => {
				if (!this.closest('[data-color-scheme]')) {
					this.setTheme(theme);
				}
			});

			// Watch ancestors for data-color-scheme changes so the sandbox
			// reacts to preview theme toggles and similar container-level
			// colour scheme overrides.
			this.ancestorObserver = new MutationObserver(() => {
				const ancestor = this.closest('[data-color-scheme]');
				const scheme = ancestor?.getAttribute('data-color-scheme');
				this.setTheme(scheme || RfContext.theme);
			});
			let el = this.parentElement;
			while (el) {
				this.ancestorObserver.observe(el, {
					attributes: true,
					attributeFilter: ['data-color-scheme'],
				});
				el = el.parentElement;
			}
		}
	}

	/** WORK-381 — render the poster + an explicit activation control in the
	 *  iframe's place. For `visible` (and when motion is allowed) an
	 *  IntersectionObserver mounts the iframe on scroll-in; `click` and
	 *  reduced-motion users always mount via the control, so motion-sensitive
	 *  visitors opt in. */
	private renderPoster() {
		const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

		const poster = document.createElement('div');
		poster.className = 'rf-sandbox__poster';
		if (this._heightAttr === 'fill') {
			// SPEC-101: in a host-owned well the poster fills too.
			poster.style.height = '100%';
		} else if (this._heightAttr !== 'auto') {
			poster.style.height = `${parseInt(this._heightAttr, 10)}px`;
		}

		if (this._poster) {
			const img = document.createElement('img');
			img.className = 'rf-sandbox__poster-image';
			img.src = this._poster;
			img.alt = '';
			img.loading = 'lazy';
			poster.appendChild(img);
		}

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'rf-sandbox__activate';
		button.textContent = `Run ${this._label}`;
		button.setAttribute('aria-label', `Run ${this._label} sandbox`);
		button.addEventListener('click', () => this.activate(), { once: true });
		poster.appendChild(button);

		this.replaceChildren(poster);

		// `visible`: auto-mount when scrolled into view — unless the visitor
		// prefers reduced motion, in which case they activate explicitly.
		if (this._activation === 'visible' && !reduce && typeof IntersectionObserver !== 'undefined') {
			this._io = new IntersectionObserver((entries) => {
				if (entries.some((e) => e.isIntersecting)) this.activate();
			}, { rootMargin: '200px' });
			this._io.observe(this);
		}
	}

	/** SPEC-104 — wire a bg-layer backdrop. Under reduced motion it never mounts
	 *  (the bg boot frame is the complete static representation). Otherwise an
	 *  IntersectionObserver mounts it on-screen and suspends it off-screen, and a
	 *  visibilitychange listener suspends it on a hidden tab — so a long page never
	 *  drives an unseen scene. */
	private initBackdrop() {
		const reduce = typeof matchMedia === 'function'
			&& matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) return; // boot frame stands in — never mount the live scene

		this._visHandler = () => {
			if (document.hidden) this.suspend();
			else if (this._onScreen) this.activate();
		};
		document.addEventListener('visibilitychange', this._visHandler);

		if (typeof IntersectionObserver === 'undefined') {
			this._onScreen = true;
			this.activate();
			return;
		}
		this._io = new IntersectionObserver((entries) => {
			this._onScreen = entries.some((e) => e.isIntersecting);
			if (this._onScreen && !document.hidden) this.activate();
			else this.suspend();
		}, { rootMargin: '200px' });
		this._io.observe(this);
	}

	/** Tear the live scene down (off-screen / hidden tab) so it stops running. The
	 *  observer + visibility listener stay wired so it re-mounts when it returns. */
	private suspend() {
		if (!this._activated) return;
		if (this.messageHandler) {
			window.removeEventListener('message', this.messageHandler);
			this.messageHandler = null;
		}
		if (this.themeCleanup) { this.themeCleanup(); this.themeCleanup = null; }
		if (this.ancestorObserver) { this.ancestorObserver.disconnect(); this.ancestorObserver = null; }
		this.iframe?.remove();
		this.iframe = null;
		this._activated = false;
	}

	disconnectedCallback() {
		if (this.messageHandler) {
			window.removeEventListener('message', this.messageHandler);
			this.messageHandler = null;
		}
		if (this.themeCleanup) {
			this.themeCleanup();
			this.themeCleanup = null;
		}
		if (this.ancestorObserver) {
			this.ancestorObserver.disconnect();
			this.ancestorObserver = null;
		}
		if (this._io) {
			this._io.disconnect();
			this._io = null;
		}
		if (this._visHandler) {
			document.removeEventListener('visibilitychange', this._visHandler);
			this._visHandler = null;
		}
		this.iframe = null;
	}

	/** Build (or rebuild) the iframe with the given theme baked into the srcdoc. */
	private buildIframe(theme: string) {
		// Preserve height from existing iframe if rebuilding
		const currentHeight = this.iframe?.style.height;

		this.iframe = document.createElement('iframe');

		// Sandbox attribute: untrusted mode drops `allow-same-origin` so the
		// iframe gets a unique opaque origin. Closes parent-origin attacks
		// (cookie theft, parent-DOM access, same-origin storage abuse).
		const sandboxAttr = this._untrusted
			? 'allow-scripts'
			: 'allow-scripts allow-same-origin';
		this.iframe.setAttribute('sandbox', sandboxAttr);

		// Tier 3 (separate-origin escape hatch): when the host has provided a
		// sandbox origin, load the iframe from `${origin}/render?...` instead
		// of using `srcdoc`. The host endpoint is responsible for serving the
		// rendered HTML with real CSP response headers (which `srcdoc` can't
		// receive). Content is delivered via `postMessage` after the iframe
		// announces itself, since URL/header transport is host-defined.
		if (this._untrusted && this._sandboxOrigin) {
			const params = new URLSearchParams({
				framework: this._framework,
				dependencies: this._dependencies,
				theme: theme || 'auto',
				height: this._heightAttr,
			});
			this.iframe.src = `${this._sandboxOrigin.replace(/\/$/, '')}/render?${params.toString()}`;
			// Wait for the iframe to signal readiness, then post the content.
			const onReady = (e: MessageEvent) => {
				if (e.data?.type === 'rf-sandbox-ready' && e.source === this.iframe?.contentWindow) {
					this.iframe!.contentWindow!.postMessage(
						{ type: 'rf-sandbox-content', content: this._content, tokens: this._tokens },
						this._sandboxOrigin,
					);
					window.removeEventListener('message', onReady);
				}
			};
			window.addEventListener('message', onReady);
		} else {
			// Tier 1/2: srcdoc with optional meta-CSP injected for untrusted mode.
			this.iframe.srcdoc = this.buildSrcdoc(this._content, this._framework, this._dependencies, this._tokens, theme, this._rfData);
		}

		this.iframe.title = this._label;
		this.iframe.setAttribute('frameborder', '0');
		this.iframe.loading = 'lazy';
		// SPEC-101 `fill`: the host owns the height (a cover media well) — pin the
		// iframe to 100% (ignoring any preserved height from a rebuild) and never
		// negotiate it via resize messages.
		const height = this._heightAttr === 'fill' ? '100%'
			: currentHeight || (this._heightAttr !== 'auto' ? parseInt(this._heightAttr) + 'px' : '150px');
		this.iframe.style.cssText = `width: 100%; border: none; height: ${height};`;

		// Untrusted-mode UX affordance: a persistent visual marker above the
		// iframe so visitors can see the content runs in a sandbox they
		// shouldn't trust. Sits in the host element's DOM, outside the iframe,
		// so author code in the iframe can't suppress or restyle it.
		const banner = this._untrusted ? this.buildUntrustedBanner() : null;

		// Auto-sizing
		if (this.messageHandler) {
			window.removeEventListener('message', this.messageHandler);
		}
		if (this._heightAttr === 'auto') {
			this.messageHandler = (e: MessageEvent) => {
				if (e.data?.type === 'rf-sandbox-resize' && e.source === this.iframe?.contentWindow) {
					this.iframe!.style.height = e.data.height + 'px';
				}
			};
			window.addEventListener('message', this.messageHandler);
		}

		if (banner) {
			this.replaceChildren(banner, this.iframe);
		} else {
			this.replaceChildren(this.iframe);
		}
	}

	/** Build the untrusted-mode banner shown above the iframe. Styled via
	 *  `.rf-sandbox__untrusted-banner` in the lumina theme. */
	private buildUntrustedBanner(): HTMLElement {
		const banner = document.createElement('div');
		banner.className = 'rf-sandbox__untrusted-banner';
		banner.setAttribute('role', 'note');
		banner.setAttribute('aria-label', 'Sandboxed user content');
		banner.textContent = 'Sandboxed user content — do not enter sensitive information.';
		return banner;
	}

	/** Public API for containers (e.g. preview behavior) to set the
	 *  sandbox theme. Rebuilds the iframe with the theme baked in. */
	setTheme(theme: string) {
		if (this._localScheme) return; // tint-mode locked, ignore
		if (!this._activated) return; // deferred + not yet mounted — nothing to retheme
		this.buildIframe(theme);
	}

	private buildSrcdoc(content: string, framework: string, dependencies: string, tokens: DesignTokens | null, theme?: string, rfData?: string): string {
		const depTags = this.buildDependencyTags(framework, dependencies, tokens);

		// SPEC-093 — expose a data binding's payload to the iframe as a frozen
		// window.RF_DATA, before any author script runs. Carried as inert JSON
		// (escape `</` so the payload can't break out of the script element).
		const rfDataScript = rfData
			? `<script type="application/json" id="rf-data">${rfData.replace(/<\//g, '<\\/')}</script>\n<script>window.RF_DATA = Object.freeze(JSON.parse(document.getElementById('rf-data').textContent));<\/script>`
			: '';
		theme = theme || RfContext.theme;

		// Apply theme on BOTH <html> and <body>. Mobile WebKit may not
		// reliably apply or retain attributes on <html> in srcdoc iframes,
		// so we duplicate on <body> as the primary target.
		const htmlAttrs = theme === 'dark' ? ' class="dark" data-theme="dark" style="color-scheme:dark"'
			: theme === 'light' ? ' data-theme="light" style="color-scheme:light"'
			: '';
		const bodyClass = theme === 'dark' ? ' class="dark"'
			: '';
		const bodyDataTheme = (theme === 'dark' || theme === 'light') ? ` data-theme="${theme}"` : '';

		// Strip data-source attributes from rendered content (authoring markers only)
		const renderedContent = content.replace(/\s*data-source(?:="[^"]*")?/g, '');

		// Tier 2 meta-CSP: when untrusted mode allows JS, inject a CSP that
		// closes the residual exfiltration / phishing surface (no fetch, no
		// off-site form posts, no tracking pixels, no external scripts).
		// MUST be the first child of <head> — meta-CSP is ignored if anything
		// (including a charset meta) precedes it. Caveat: meta-CSP can't
		// deliver `frame-ancestors` or `report-uri` — those need response
		// headers, which is what Tier 3 (separate-origin) is for.
		const cspMeta = this.buildCspMetaTag();

		return `<!DOCTYPE html>
<html${htmlAttrs}>
<head>${cspMeta ? `\n${cspMeta}` : ''}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${depTags}
<style>
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; color-scheme: light dark; overflow: hidden; }
  body.dark, body[data-theme="dark"] { color-scheme: dark; }
</style>
${rfDataScript ? rfDataScript + '\n' : ''}</head>
<body${bodyClass}${bodyDataTheme}>
${renderedContent}
<script>
  var ro = new ResizeObserver(function() {
    parent.postMessage({ type: 'rf-sandbox-resize', height: document.body.scrollHeight }, '*');
  });
  ro.observe(document.body);
<\/script>
<script>
  // The Tailwind CDN may ignore darkMode:"class" config and generate
  // @media (prefers-color-scheme: dark) rules instead. On desktop this
  // works via parent color-scheme propagation; on mobile it doesn't.
  // Fix: when theme is forced (not auto), rewrite the media-query rules:
  //  - dark: duplicate as .dark ancestor selectors, remove originals
  //  - light: just remove originals (prevents OS dark from leaking in)
  //  - auto: leave untouched (media query follows OS preference)
  var forcedTheme = document.body.getAttribute('data-theme');
  function patchDarkCSS() {
    if (!forcedTheme) return; // auto — leave media queries intact
    try {
      for (var i = 0; i < document.styleSheets.length; i++) {
        var sheet = document.styleSheets[i], rules;
        try { rules = sheet.cssRules; } catch(e) { continue; }
        for (var j = rules.length - 1; j >= 0; j--) {
          var r = rules[j];
          if (r instanceof CSSMediaRule && r.conditionText === '(prefers-color-scheme: dark)') {
            if (forcedTheme === 'dark') {
              for (var k = 0; k < r.cssRules.length; k++) {
                var inner = r.cssRules[k];
                if (inner.cssText) {
                  sheet.insertRule('.dark ' + inner.cssText, rules.length);
                }
              }
            }
            // Remove original media query rule — for dark, the .dark
            // ancestor selectors replace it; for light, removing it
            // prevents OS dark preference from leaking in.
            sheet.deleteRule(j);
          }
        }
      }
    } catch(e) {}
  }
  // Run after Tailwind CDN generates CSS (deferred to after current task)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(patchDarkCSS, 0); });
  } else {
    setTimeout(patchDarkCSS, 0);
  }
  // Also re-patch when Tailwind re-generates (MutationObserver on style tags)
  new MutationObserver(function(mutations) {
    for (var m = 0; m < mutations.length; m++) {
      for (var n = 0; n < mutations[m].addedNodes.length; n++) {
        if (mutations[m].addedNodes[n].nodeName === 'STYLE') { setTimeout(patchDarkCSS, 0); return; }
      }
    }
  }).observe(document.head, { childList: true });
<\/script>${(!theme || theme === 'auto') ? `
<script>if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.body.classList.add('dark');document.body.setAttribute('data-theme','dark')}<\/script>` : ''}
</body>
</html>`;
	}

	/** Build the meta-CSP tag injected into srcdoc when in untrusted mode.
	 *  Returns an empty string for trusted mode (CSP off). The CSP is intentionally
	 *  tight: no fetch/XHR (`connect-src 'none'`), no off-site form posts
	 *  (`form-action 'none'`), no tracking pixels (`img-src` limited to data URLs
	 *  + permitted CDN origins), no external script loads except the framework
	 *  preset and explicit `dependencies` URLs.
	 *
	 *  Caveats: meta-CSP must be the first child of <head> or browsers ignore it,
	 *  and it can't deliver `frame-ancestors` or `report-uri`. For the strongest
	 *  guarantees use Tier 3 (separate-origin) and have the host serve real CSP
	 *  response headers. */
	private buildCspMetaTag(): string {
		if (!this._untrusted) return '';

		// Collect the origins we need to permit so framework presets and
		// declared dependencies still load. The host opted into JS by setting
		// `allowJs: true`; CDN origins they trust come along for the ride.
		const origins = new Set<string>();
		const addOrigin = (url: string) => {
			try {
				const u = new URL(url);
				origins.add(`${u.protocol}//${u.host}`);
			} catch {
				// Skip non-absolute URLs — author-relative paths can't reach
				// outside the sandbox origin anyway.
			}
		};

		if (this._framework && FRAMEWORK_PRESETS[this._framework]) {
			for (const tag of FRAMEWORK_PRESETS[this._framework]) {
				const m = tag.match(/(?:src|href)="([^"]+)"/);
				if (m) addOrigin(m[1]);
			}
		}
		if (this._dependencies) {
			for (const url of this._dependencies.split(',').map(u => u.trim()).filter(Boolean)) {
				addOrigin(url);
			}
		}

		const styleSrc = ["'unsafe-inline'", ...origins].join(' ');
		const fontSrc = ["data:", "https://fonts.gstatic.com", ...origins].join(' ');
		const imgSrc = ["data:", ...origins].join(' ');
		const scriptSrc = this._allowJs
			? ["'unsafe-inline'", ...origins].join(' ')
			: "'none'";

		const directives = [
			"default-src 'none'",
			`script-src ${scriptSrc}`,
			`style-src ${styleSrc}`,
			`font-src ${fontSrc}`,
			`img-src ${imgSrc}`,
			"connect-src 'none'",
			"form-action 'none'",
			"base-uri 'none'",
			"frame-src 'none'",
			"object-src 'none'",
		].join('; ');
		return `<meta http-equiv="Content-Security-Policy" content="${directives}">`;
	}

	private buildDependencyTags(framework: string, dependencies: string, tokens: DesignTokens | null): string {
		const tags: string[] = [];

		// Design tokens (injected before framework so they serve as defaults)
		if (tokens) {
			tags.push(this.buildDesignTokenTags(tokens));
		}

		if (framework && FRAMEWORK_PRESETS[framework]) {
			if (framework === 'tailwind' && tokens) {
				tags.push('<script src="https://cdn.tailwindcss.com"><\\/script>');
				const tokenConfig = this.buildTailwindTokenConfig(tokens);
				if (tokenConfig) {
					tags.push(tokenConfig);
				} else {
					tags.push('<script>tailwind.config = { darkMode: "class" }<\\/script>');
				}
			} else {
				tags.push(...FRAMEWORK_PRESETS[framework]);
			}
		}

		if (dependencies) {
			for (const url of dependencies.split(',').map(u => u.trim()).filter(Boolean)) {
				if (url.endsWith('.css')) {
					tags.push(`<link rel="stylesheet" href="${url}">`);
				} else {
					tags.push(`<script src="${url}"><\\/script>`);
				}
			}
		}

		return tags.join('\n');
	}

	private buildDesignTokenTags(tokens: DesignTokens): string {
		const parts: string[] = [];

		if (tokens.fonts && tokens.fonts.length > 0) {
			const families = tokens.fonts.map(f => {
				const name = f.family.replace(/ /g, '+');
				const weights = f.weights.sort((a, b) => a - b).join(';');
				return `family=${name}:wght@${weights}`;
			});
			const url = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
			parts.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
			parts.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
			parts.push(`<link href="${url}" rel="stylesheet">`);
		}

		const vars: string[] = [];
		if (tokens.fonts) {
			for (const f of tokens.fonts) {
				const fallback = ROLE_FALLBACKS[f.role] || 'sans-serif';
				vars.push(`  --font-${f.role}: '${f.family}', ${fallback};`);
			}
		}
		if (tokens.colors) {
			for (const c of tokens.colors) {
				const varName = c.name.toLowerCase().replace(/\s+/g, '-');
				vars.push(`  --color-${varName}: ${c.value};`);
			}
		}
		if (tokens.spacing?.unit) {
			vars.push(`  --spacing-unit: ${tokens.spacing.unit};`);
		}
		if (tokens.radii) {
			for (const r of tokens.radii) {
				const varName = r.name.toLowerCase().replace(/\s+/g, '-');
				vars.push(`  --radius-${varName}: ${r.value};`);
			}
		}
		if (tokens.shadows) {
			for (const s of tokens.shadows) {
				const varName = s.name.toLowerCase().replace(/\s+/g, '-');
				vars.push(`  --shadow-${varName}: ${s.value};`);
			}
		}

		if (vars.length > 0) {
			const rules: string[] = [`:root {\n${vars.join('\n')}\n}`];
			if (tokens.fonts) {
				const bodyFont = tokens.fonts.find(f => f.role === 'body');
				const headingFont = tokens.fonts.find(f => f.role === 'heading');
				const monoFont = tokens.fonts.find(f => f.role === 'mono');
				if (bodyFont) rules.push('body { font-family: var(--font-body); }');
				if (headingFont) rules.push('h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }');
				if (monoFont) rules.push('code, pre, kbd { font-family: var(--font-mono); }');
			}
			parts.push(`<style>\n${rules.join('\n')}\n</style>`);
		}

		return parts.join('\n');
	}

	private buildTailwindTokenConfig(tokens: DesignTokens): string {
		const extend: Record<string, Record<string, unknown>> = {};
		if (tokens.fonts) {
			extend.fontFamily = {};
			for (const f of tokens.fonts) {
				const fallback = ROLE_FALLBACKS[f.role] || 'sans-serif';
				extend.fontFamily[f.role] = [`'${f.family}'`, fallback];
			}
		}
		if (tokens.colors) {
			extend.colors = {};
			for (const c of tokens.colors) {
				const key = c.name.toLowerCase().replace(/\s+/g, '-');
				extend.colors[key] = c.value;
			}
		}
		if (tokens.radii) {
			extend.borderRadius = {};
			for (const r of tokens.radii) {
				const key = r.name.toLowerCase().replace(/\s+/g, '-');
				extend.borderRadius[key] = r.value;
			}
		}
		if (Object.keys(extend).length === 0) return '';
		return `<script>tailwind.config = { darkMode: "class", theme: { extend: ${JSON.stringify(extend)} } }<\/script>`;
	}
}
