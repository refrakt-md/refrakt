/**
 * `refrakt validate` — the site-author's command (SPEC-135 D1).
 *
 * **Vacated, not yet filled.** WORK-579 moved the theme-authoring checks this
 * command used to carry into `refrakt theme validate`, where their audience is;
 * WORK-578 fills the space with config resolution and content validation for
 * every site in `refrakt.config.json`.
 *
 * In between, it validates nothing — and says so. The alternative was to leave
 * the old behaviour in place, which was the actual defect: with no arguments it
 * validated `baseConfig`, refrakt's own built-in theme config, and printed a
 * checkmark. In a user's project that is a self-test of the library reported as
 * though it were a check of their work.
 *
 * Exits non-zero deliberately. A command that validated nothing must not report
 * success (SPEC-135 D2), and in a CI job a silent zero here would be a false
 * green — the failure class this whole milestone exists to remove.
 */
export interface ValidateOptions {
	site?: string;
}

export function validateCommand(_opts: ValidateOptions): void {
	console.error('`refrakt validate` does not validate anything yet.');
	console.error('');
	console.error('Site validation — config resolution, then content, for every site in');
	console.error('refrakt.config.json — lands in WORK-578. Until then:');
	console.error('');
	console.error('  refrakt theme validate --config <path>     ThemeConfig (theme authors)');
	console.error('  refrakt theme validate --manifest <path>   theme manifest (theme authors)');
	console.error('  refrakt plugins validate                   a plugin package');
	console.error('');
	console.error('`--config` and `--manifest` moved to `refrakt theme validate`: they check');
	console.error('theme-authoring artifacts, under a name that reads like a site-authoring one.');
	process.exit(1);
}
