/** Manifest shapes for distributable extensions (SPEC-109, SPEC-111, ADR-023).
 *
 *  Three things travel through refrakt's shared install surface: themes
 *  (`ThemeManifest`, in `./theme`), site templates (`TemplateManifest`,
 *  `template.json`), and preset packs (`PresetPackManifest`, `presets.json`).
 *  Each declares a `refrakt` compatibility range validated at install
 *  (ADR-023). A package may declare several capabilities at once — Lumina is a
 *  theme that *also* ships a preset pack — so these are independent manifests,
 *  not a single `kind` discriminator (SPEC-111 §1). */

import type { SiteConfig } from './theme.js';

/** Site-template manifest — `template.json` (SPEC-109 §2).
 *
 *  A full-site template **is a site**: its payload is a `SiteConfig` partial,
 *  slotted under a target site key at install. The `site` partial deliberately
 *  omits `contentDir`/`sandbox.dir` — those destinations are install-derived
 *  from the framework starter layout and the target site key, not author-set
 *  (SPEC-109 §2). The package always ships fixed `content/` (and optional
 *  `sandboxes/`) source folders. */
export interface TemplateManifest {
	/** Only `"site"` is implemented (full-site, SPEC-109). `"section"` is
	 *  reserved for a future overlay-into-existing-site template and defaults to
	 *  `"site"` when omitted. */
	kind?: 'site' | 'section';
	name: string;
	title: string;
	description?: string;
	/** Catalog category, e.g. `"docs"`, `"portfolio"`. */
	category?: string;
	/** Compatible refrakt range, validated at install (ADR-023). */
	refrakt?: string;
	/** Optional URL of a published demo of this template. */
	previewUrl?: string;
	/** The site this template provides: a `SiteConfig` partial **without**
	 *  `contentDir`/`sandbox.dir` (install-derived). */
	site: TemplateSiteConfig;
}

/** A `SiteConfig` partial as authored in `template.json` — every field is
 *  optional, and the two install-derived path fields are removed so an author
 *  cannot (mistakenly) pin a project-root destination that would collide under
 *  a non-default site key. */
export type TemplateSiteConfig = Omit<Partial<SiteConfig>, 'contentDir' | 'sandbox'>;

/** The scope of a preset — the mood-vs-skeleton boundary the engine already
 *  enforces via `filterScopeEligible` (SPEC-111 §2).
 *  - `syntax`: touches only `syntax.*` (+ optionally `color.code.*`).
 *    Theme-universal by construction.
 *  - `palette`: also claims chrome tokens. Reskins the page; tuned to a canvas. */
export type PresetScope = 'syntax' | 'palette';

/** One preset entry in a `presets.json` manifest (SPEC-111 §3). */
export interface PresetEntry {
	/** Stable identifier, referenced in listings. */
	id: string;
	/** Human-readable title. */
	title: string;
	/** Declared scope, validated against the module's actual token namespaces. */
	scope: PresetScope;
	/** Module path that resolves to a `ThemeTokensConfig`. May be a `.json`
	 *  file (declarative carrier, the default) or a JS/TS module with a
	 *  `default`/`config` export (SPEC-111 §6). */
	module: string;
	/** Advisory list of theme package names this preset was tuned against.
	 *  Absence means universal; applying outside the set is never an error. */
	tunedFor?: string[];
}

/** Preset-pack manifest — `presets.json` (SPEC-111 §1, §3). A standalone pack
 *  that ships one or more presets independent of any theme. */
export interface PresetPackManifest {
	name: string;
	/** Compatible refrakt range, validated at install (ADR-023). */
	refrakt?: string;
	presets: PresetEntry[];
}
