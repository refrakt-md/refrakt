import Markdoc from '@markdoc/markdoc';
import type { Node, ValidateError } from '@markdoc/markdoc';
import type { PipelineWarning } from '@refrakt-md/types';

/**
 * Content validation (SPEC-132).
 *
 * Every rune schema declares required attributes, typed attributes and
 * `matches` enums, and `Markdoc.validate()` can check all of them. Until this
 * module, nothing in a build ever asked it to: the validator ran in the
 * language server and over the fixture corpus, never over a user's pages
 * (BUG-014).
 *
 * The call lives here and runs against the *same* config object handed to
 * `Markdoc.transform`, so it cannot disagree with what the transform sees and
 * plugin runes are covered with no extra wiring.
 */

/** Markdoc's severity ladder, as emitted on `ValidateError.error.level`. */
type MarkdocLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

/**
 * Error ids reported out of the box — SPEC-132 phases 1 and 2.
 *
 * An explicit allow-list rather than a deny-list, so enabling an id is a
 * deliberate act rather than a side effect of Markdoc adding one.
 *
 * `variable-undefined` is absent and must stay that way. Markdoc validates the
 * *full path*, has no scope model, and most variable use in real content is
 * scope-local — `$item` and `$row` bound per-iteration inside rune body
 * templates, with valid paths depending on author-defined frontmatter. Enabling
 * it flags every collection template. See SPEC-132 D4: it is out of scope
 * entirely rather than deferred, and needs its own spec.
 */
export const DEFAULT_VALIDATION_IDS: readonly string[] = [
	// Phase 1 (WORK-556). `tag-undefined` is the one the milestone is sold on:
	// a mistyped rune drops its tag and renders its children as prose, so the
	// block silently vanishes from the page.
	'tag-undefined',
	'attribute-undefined',
	// Phase 2 (WORK-558), gated on WORK-557's blast-radius measurement. These
	// are what make `required` and `matches` mean something across ~175 tags,
	// and they are the ids that wake the custom attribute validators in
	// `packages/runes/src/attributes.ts` and `plugins/media/src/attributes.ts`
	// — which had never executed in a build, because `transform()` does not
	// invoke a custom type's `validate()`.
	'attribute-value-invalid',
	'attribute-missing-required',
	'attribute-type-invalid',
];

/** How a finding's Markdoc level maps onto `PipelineWarning.severity`.
 *
 *  `critical` and `error` both land on `'error'` because `PipelineWarning` has
 *  no fifth level; the distinction that matters (D11) is not severity but
 *  suppressibility, which {@link isSuppressible} keeps separate. */
function severityFor(level: MarkdocLevel): PipelineWarning['severity'] {
	switch (level) {
		case 'critical':
		case 'error':
			return 'error';
		case 'warning':
			return 'warning';
		default:
			return 'info';
	}
}

/**
 * Whether a finding may be silenced by configuration (SPEC-132 D5 / D11).
 *
 * `critical` means the document could not be *understood* — a parse error, an
 * unclosed tag, a tag in an impossible position. That is not a matter of
 * preference, so no config switch turns it off. Everything else is the
 * configurable band.
 */
export function isSuppressible(level: MarkdocLevel): boolean {
	return level !== 'critical';
}

/**
 * Per-site validation settings, resolved from `refrakt.config.json`.
 *
 * Deliberately per-site and per-error-id, and nothing finer. Per-page or
 * per-tag suppression invites silencing the one call site that revealed a real
 * bug, which is how a validation feature becomes decoration (SPEC-132 D5).
 */
export interface ValidationSettings {
	/** Master switch. `false` stops reporting every suppressible finding;
	 *  `critical` findings still report (D11). */
	enabled: boolean;
	/** Error ids to report, replacing {@link DEFAULT_VALIDATION_IDS} entirely. */
	ids?: readonly string[];
	/** Error ids to stop treating as problems. Demoted to `info` rather than
	 *  dropped — see {@link validatePage}. */
	disableIds?: readonly string[];
}

export const DEFAULT_VALIDATION_SETTINGS: ValidationSettings = { enabled: true };

/** Resolve the effective id allow-list for a site. */
export function resolveValidationIds(settings?: ValidationSettings): Set<string> {
	const base = settings?.ids ?? DEFAULT_VALIDATION_IDS;
	const disabled = new Set(settings?.disableIds ?? []);
	return new Set(base.filter((id) => !disabled.has(id)));
}

/** Ids the site asked to stop treating as problems, as distinct from ids that
 *  were never enabled. The two are handled differently: a disabled id is
 *  demoted, an id outside the allow-list is dropped. */
function demotedIds(settings?: ValidationSettings): Set<string> {
	return new Set(settings?.disableIds ?? []);
}

export interface ValidatePageOptions {
	/** Page URL, carried onto every finding. */
	url: string;
	/** Resolved per-site settings. Defaults to enabled with the standard ids. */
	settings?: ValidationSettings;
	/** Set when the page was synthesized by a plugin rather than read from a
	 *  file (SPEC-069). A finding on such a page is a *plugin* bug reported
	 *  against a page whose source the author cannot open, so it is attributed
	 *  to the plugin and says plainly that the page was generated — SPEC-132's
	 *  open question, answered with the cheaper of its two options. */
	contributedBy?: string;
}

/**
 * Validate one page's AST against the config its transform will use.
 *
 * Returns `PipelineWarning`s and nothing else — no node is injected into the
 * page and no content is replaced (D9). A validation finding annotates content
 * that rendered perfectly well, so it belongs beside the page, not in it;
 * display is WORK-395's editor validation rail.
 *
 * Never throws: a validator that breaks the build it was added to protect is
 * worse than no validator. A failure inside `Markdoc.validate` is itself
 * reported as a finding.
 *
 * Three dispositions, and the difference between them is the point:
 *
 * | case | outcome |
 * |---|---|
 * | `critical` level | always reported; no configuration silences it (D11) |
 * | id in `disableIds` | **demoted to `info`** |
 * | id outside the allow-list, or `enabled: false` | dropped |
 *
 * Demotion rather than deletion is WORK-559's recorded decision. An id someone
 * has actively judged unimportant should stop adding noise to the build
 * summary, but it should not become invisible: a reader who goes looking — or
 * the editor's validation rail — can still see what was set aside, and turning
 * the id back on is then an informed choice rather than a leap. Ids that were
 * never enabled are a different thing and are simply not reported; there is no
 * value in an `info` stream of every check the project has decided against.
 */
export function validatePage(
	ast: Node,
	config: unknown,
	opts: ValidatePageOptions,
): PipelineWarning[] {
	return validatePageDetailed(ast, config, opts).map((f) => f.warning);
}

/**
 * A finding, plus the structured fields `PipelineWarning` has nowhere to put.
 *
 * `PipelineWarning` is the build's diagnostic shape: severity, phase, plugin,
 * url, message. The Markdoc error id and source line are *formatted into* the
 * message there, which is fine for a build summary a human reads and useless to
 * a caller that wants to filter by id or open a file at a line — the CLI's
 * `--format json` (WORK-578) and the MCP tool (WORK-581, SPEC-135 D6).
 *
 * Carried alongside rather than added to `PipelineWarning` so the build's
 * diagnostic shape is unchanged and the two cannot drift: the warning here is
 * the identical object `validatePage` returns.
 */
export interface DetailedFinding {
	/** Exactly what `validatePage` reports for this finding. */
	warning: PipelineWarning;
	/** Markdoc error id, e.g. `tag-undefined`. Absent only when validation
	 *  itself crashed and the finding is the fallback. */
	id?: string;
	/** 1-based source line, matching what the message renders. */
	line?: number;
}

/**
 * {@link validatePage}, keeping the structured fields.
 *
 * This is where the dispositions actually live; `validatePage` is a projection
 * of it. Single-sourced deliberately — SPEC-135 D5a requires that every caller
 * resolve settings through `resolveValidationIds` rather than reimplementing
 * the three-way refinement, and the cheapest way to guarantee that is for there
 * to be exactly one implementation to call.
 */
export function validatePageDetailed(
	ast: Node,
	config: unknown,
	opts: ValidatePageOptions,
): DetailedFinding[] {
	const settings = opts.settings ?? DEFAULT_VALIDATION_SETTINGS;
	const allowed = resolveValidationIds(settings);
	const demoted = demotedIds(settings);
	const pluginName = opts.contributedBy ?? 'core';

	let findings: ValidateError[];
	try {
		findings = Markdoc.validate(ast, config as never);
	} catch (err) {
		return [
			{
				warning: {
					severity: 'warning',
					phase: 'validate',
					pluginName,
					url: opts.url,
					message: `content validation could not run: ${(err as Error).message}`,
				},
			},
		];
	}

	const out: DetailedFinding[] = [];
	for (const finding of findings) {
		const level = finding.error.level as MarkdocLevel;
		const id = finding.error.id;
		let severity = severityFor(level);

		// `critical` is reported unconditionally — neither the master switch, the
		// allow-list, nor `disableIds` can touch it.
		if (isSuppressible(level)) {
			if (!settings.enabled) continue;
			if (demoted.has(id)) {
				severity = 'info';
			} else if (!allowed.has(id)) {
				continue;
			}
		}

		const rawLine = finding.lines?.[0];
		out.push({
			warning: {
				severity,
				phase: 'validate',
				pluginName,
				url: opts.url,
				message: formatFinding(finding, opts.contributedBy),
			},
			id,
			// `formatFinding` renders `line + 1`; match it so a caller and the
			// message never disagree about which line is meant.
			line: typeof rawLine === 'number' ? rawLine + 1 : undefined,
		});
	}
	return out;
}

/** Render one finding as a single line: what is wrong, where, and — for a
 *  generated page — who generated it. */
function formatFinding(finding: ValidateError, contributedBy?: string): string {
	const line = finding.lines?.[0];
	const at = typeof line === 'number' ? ` (line ${line + 1})` : '';
	const origin = contributedBy ? ` [generated by ${contributedBy}]` : '';
	return `${finding.error.id}: ${finding.error.message}${at}${origin}`;
}
