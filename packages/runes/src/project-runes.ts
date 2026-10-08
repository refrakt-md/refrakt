/**
 * A project's own composed runes — SPEC-153 D4, D5, D8 and SPEC-145 D25.
 *
 * A project declares `runes.dir` (default `runes`), and every `<rune>.md` in it
 * is a composed rune named after the file. The directory is read through
 * `ProjectFiles` (D5), so the same code serves a build on disk and a hosted
 * build over `memoryProjectFiles`, and containment is the provider's: a path
 * that escapes the project root is refused there, not here.
 *
 * The definitions become `PluginRune` entries of a pseudo-plugin named
 * `__project__`, through the same reader and the same `pluginRune` a plugin's
 * `runeDir` uses (D1). `mergePlugins` takes it as its project layer and applies
 * D8's precedence.
 */
import type { CompositionErrorCode } from './lib/composition-errors.js';
import type { PluginRune, ProjectFiles } from '@refrakt-md/types';
import {
	CompositionError,
	frontmatterKeyLine,
	parseCompositionDefinition,
} from './lib/composition.js';
import { pluginRune } from './plugins.js';
import type { LoadedPlugin } from './plugins.js';
import { PROJECT_RUNES, readRuneDefinitions, runeEntriesOf } from './rune-dir.js';

export { PROJECT_RUNES };
import type { Rune } from './rune.js';

/** `runes.dir` when a project does not declare one (D4). */
export const DEFAULT_PROJECT_RUNE_DIR = 'runes';

/** One definition that did not load. */
export interface ProjectRuneFinding {
	/** The definition's project-relative path, `<dir>/<rune>.md`. */
	file: string;
	/** 1-based line in that file. */
	line: number;
	/** The rune, when the file name is one. */
	rune?: string;
	/** Its entry in `COMPOSITION_ERRORS`, when the failure is a coded one. */
	code?: CompositionErrorCode;
	message: string;
}

/** What reading a project's rune directory produced: the runes that built,
 *  and a finding for each definition that did not. */
export interface ProjectRunesResult {
	loaded: LoadedPlugin;
	findings: ProjectRuneFinding[];
}

/**
 * SPEC-145 D25 item 2 — a user definition may not declare `schema`. Its row
 * would publish as JSON-LD with nobody reviewing it, and nothing checks a row
 * against schema.org; the same definition in a plugin's `runeDir` is reviewed
 * like the plugin's code, so it may.
 */
function schemaBanned(name: string, source: string): CompositionError | undefined {
	const definition = parseCompositionDefinition(name, source);
	if (definition.schema === undefined) return undefined;
	const err = new CompositionError(
		'project-schema',
		`Rune "${name}": a project's own definition may not declare \`schema\` (SPEC-145 D25). Its schema.org row would publish as structured data with no reviewer, and nothing checks a row against schema.org. Remove the \`schema\` block; a plugin's rune directory may declare one, because a published package is reviewed like code.`,
	);
	const index = frontmatterKeyLine(definition.frontmatter, ['schema']);
	err.line = index === undefined ? 1 : index + 2;
	return err;
}

/**
 * Read and build every definition in a project's rune directory, collecting a
 * finding for each that fails instead of stopping at the first — `refrakt
 * validate` reports them all. A directory the provider does not have (absent,
 * or refused because it escapes the root) defines no runes.
 */
export function checkProjectRunes(
	files: Pick<ProjectFiles, 'list' | 'read'>,
	dir: string = DEFAULT_PROJECT_RUNE_DIR,
): ProjectRunesResult {
	const findings: ProjectRuneFinding[] = [];
	const where = `runes.dir "${dir}"`;
	const entries: Record<string, PluginRune> = {};
	const runes: Record<string, Rune> = {};

	// The reader's list is the provider's; a name it rejects is one finding,
	// and the rest of the directory still loads.
	const listed = files.list(dir).filter((f) => f.endsWith('.md'));
	for (const file of listed.sort()) {
		const path = dir === '' || dir === '.' ? file : `${dir}/${file}`;
		let name: string | undefined;
		try {
			const [definition] = readRuneDefinitions(
				{ list: () => [file], read: (p) => files.read(p) },
				dir,
				where,
			);
			name = definition.name;
			const banned = schemaBanned(name, definition.source);
			if (banned) throw banned;
			const entry = runeEntriesOf([definition])[name];
			runes[name] = pluginRune(name, entry, { name: PROJECT_RUNES });
			entries[name] = entry;
		} catch (e) {
			const { line, code } = e as CompositionError;
			findings.push({
				file: path,
				line: typeof line === 'number' ? line : 1,
				...(code ? { code } : {}),
				...(name ? { rune: name } : {}),
				message: (e as Error).message,
			});
		}
	}

	return {
		loaded: {
			pkg: { name: PROJECT_RUNES, version: '0.0.0', runes: entries },
			npmName: PROJECT_RUNES,
			runes,
			fixtures: {},
			fileRoots: {},
		},
		findings,
	};
}

/**
 * A project's runes, for a build: as {@link checkProjectRunes}, but the first
 * definition that fails throws, naming its file and line. Pass the result to
 * `mergePlugins` as its project layer.
 */
export function loadProjectRunes(
	files: Pick<ProjectFiles, 'list' | 'read'>,
	dir: string = DEFAULT_PROJECT_RUNE_DIR,
): LoadedPlugin {
	const { loaded, findings } = checkProjectRunes(files, dir);
	if (findings.length > 0) {
		const [first] = findings;
		const more = findings.length > 1 ? ` (and ${findings.length - 1} more)` : '';
		throw new CompositionError(
			first.code ?? 'invalid-value',
			`${first.file}:${first.line}: ${first.message}${more}`,
		);
	}
	return loaded;
}
