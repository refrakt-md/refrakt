/**
 * Rune directories — SPEC-153: one file format, two read paths, one in-memory
 * shape (D1).
 *
 * A composed rune arrives as a file, `<rune>.md`, whose name is the rune's name
 * (D9). A plugin declares the directory (`Plugin.runeDir`, D2) and it is read
 * from the package on disk; a project declares one in config (`runes.dir`, D4)
 * and it is read through `ProjectFiles` (D5). Both readers hand their files to
 * {@link readRuneDefinitions}, and every file becomes the same thing a plugin
 * could have written by hand: a `PluginRune` carrying the file as its
 * `template`. Nothing downstream can tell where a definition came from.
 */
import { CompositionError } from './lib/composition-errors.js';
import type { PluginRune } from '@refrakt-md/types';

/**
 * Read access to one directory of definitions. `ProjectFiles` satisfies it;
 * the plugin side passes a reader over the package directory that throws
 * instead of reporting absence (D3).
 */
export interface RuneDirReader {
	/** Entry names directly under `dir`. */
	list(dir: string): string[];
	/** A file's text, or `null` when it is not a readable file. */
	read(path: string): string | null;
}

/** One definition file, read. */
export interface RuneDefinitionFile {
	/** The rune's name: the file's name without `.md` (D9). */
	name: string;
	/** The file's path as the reader addresses it (`<dir>/<rune>.md`). */
	path: string;
	source: string;
}

/** The pseudo-plugin name a project's runes carry, and the `runes.prefer`
 *  value that lets one shadow a plugin's rune (SPEC-153 D8). */
export const PROJECT_RUNES = '__project__';

const RUNE_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * The rune a definition file defines, from its name alone (D9). A file whose
 * stem is not a kebab-case rune name is rejected rather than skipped: in a
 * declared rune directory every `.md` is a definition, and one that silently
 * did not load would surface only as an undefined tag on the pages using it.
 */
export function runeNameOfFile(file: string, where: string): string {
	const stem = file.slice(0, -'.md'.length);
	if (!RUNE_NAME.test(stem)) {
		const hint = stem.includes('.')
			? ' The directory already says what its files are, so a definition takes no suffix: `playlist.md`, not `playlist.rune.md`. Fixtures belong in a sibling `fixtures/` directory.'
			: '';
		throw new CompositionError(
			'file-name-invalid',
			`${where}: "${file}" is not a rune definition file. Every \`.md\` in a rune directory is one, named \`<rune>.md\` with a kebab-case rune name (SPEC-153 D9).${hint}`,
		);
	}
	return stem;
}

/**
 * Every definition in a rune directory, sorted by name. Entries that are not
 * `.md` files are not definitions and are skipped; a `.md` that cannot be read
 * throws, naming it.
 */
export function readRuneDefinitions(
	reader: RuneDirReader,
	dir: string,
	where: string,
): RuneDefinitionFile[] {
	const join = (name: string) => (dir === '' || dir === '.' ? name : `${dir}/${name}`);
	const out: RuneDefinitionFile[] = [];
	for (const file of [...reader.list(dir)].sort()) {
		if (!file.endsWith('.md')) continue;
		const name = runeNameOfFile(file, where);
		const path = join(file);
		const source = reader.read(path);
		if (source === null) {
			throw new CompositionError(
				'file-unreadable',
				`${where}: "${path}" is listed but could not be read as a file.`,
			);
		}
		out.push({ name, path, source });
	}
	return out;
}

/** The `PluginRune` entries a directory's definitions are — the one in-memory
 *  shape both read paths produce (D1). */
export function runeEntriesOf(files: readonly RuneDefinitionFile[]): Record<string, PluginRune> {
	const entries: Record<string, PluginRune> = {};
	for (const file of files) entries[file.name] = { template: file.source };
	return entries;
}

/**
 * A plugin with its rune directory's definitions added to `Plugin.runes` — the
 * part of loading a `runeDir` that does not touch the disk, shared by every
 * plugin loader. A declared directory with no definitions, and a definition
 * whose name a `runes` entry (or its alias) already takes, throw (SPEC-153 D3).
 * `where` names the directory in messages; `pathOf` names a file in it.
 */
export function withRuneDefinitions<P extends { runes?: Record<string, PluginRune> }>(
	pkg: P,
	files: readonly RuneDefinitionFile[],
	where: string,
	pathOf: (file: RuneDefinitionFile) => string = (file) => file.path,
): P & { runes: Record<string, PluginRune> } {
	if (files.length === 0) {
		throw new CompositionError(
			'rune-dir-empty',
			`${where} holds no \`<rune>.md\` definition. A declared rune directory that ships empty is a packaging bug: check the package's \`files\` (SPEC-153 D3).`,
		);
	}
	const claimedBy = new Map<string, string>();
	for (const [name, entry] of Object.entries(pkg.runes ?? {})) {
		claimedBy.set(name, `\`Plugin.runes.${name}\``);
		for (const alias of entry.aliases ?? []) {
			if (!claimedBy.has(alias)) claimedBy.set(alias, `an alias of \`Plugin.runes.${name}\``);
		}
	}
	for (const file of files) {
		const other = claimedBy.get(file.name);
		if (other) {
			throw new CompositionError(
				'rune-defined-twice',
				`${where} defines rune "${file.name}" twice: as ${pathOf(file)} and as ${other}. A rune has one definition; remove one of them.`,
			);
		}
	}
	return { ...pkg, runes: { ...pkg.runes, ...runeEntriesOf(files) } };
}
