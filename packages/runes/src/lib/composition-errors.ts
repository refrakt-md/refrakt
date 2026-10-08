/**
 * Every construction-time error a composed rune definition can produce, by
 * stable code — the compiler's (`composition.ts`), its wrapper's
 * (`composed-rune.ts`), the catalog check's, and the loaders' (`rune-dir.ts`,
 * `project-runes.ts`, the `runeDir`/precedence/`runes.local` paths in
 * `plugins.ts`).
 *
 * The codes are what the authoring guide documents
 * (`site/content/extend/rune-authoring/composed-runes.md`, "Errors"), one entry
 * each with its cause and its fix. `composed-runes-guide.test.ts` fails when a
 * throw site in those files carries no code, when a code has no docs entry, and
 * when the docs list a code that no longer exists — so an error cannot be added
 * without being documented.
 */
export const COMPOSITION_ERRORS = {
	// The definition file and its frontmatter
	'name-not-kebab': 'The rune name (the file name) is not kebab-case.',
	'no-frontmatter': 'The definition has no `---` frontmatter block.',
	'frontmatter-yaml': 'The frontmatter is not valid YAML, or not a mapping.',
	'name-restated': 'The frontmatter restates the rune’s name (`rune:` / `name:`).',
	'style-key': 'The frontmatter declares styles (`css`, `block`, `class`, …).',
	'second-emit-path': 'The definition declares another emit path (`transform`, `emits`, `slots`).',
	'layout-key': 'The frontmatter declares `layout`.',
	'unknown-key': 'The frontmatter has a key a definition does not take.',
	'invalid-value': 'A frontmatter value has the wrong shape (`tag`, `aliases`, `schema`, …).',
	'attribute-invalid': 'An `attributes` entry is malformed.',
	'attribute-reserved': 'An enum attribute would render as a `data-*` the engine writes itself.',
	'content-model-type': '`content.type` is not `sequence` or `sections`.',
	'content-model-invalid': 'The `content` model, or one of its fields, is malformed.',
	'schema-invalid': 'The `schema` table is rejected by its own checks.',
	'registers-invalid': 'The `registers` declaration is rejected by its own checks.',

	// The template
	'template-parse': 'Markdoc cannot parse the template.',
	'preprocessor-tag': 'The template uses `{% data %}`, `{% snippet %}` or `{% include %}`.',
	'attrs-undeclared': '`$attrs.x` names no declared attribute.',
	'each-outside-slot': '`$each` is used outside an `each` slot.',
	'each-field-not-emitted': '`$each.x` names a field the content model does not emit.',
	'slot-invalid': 'A `{% slot %}` has an attribute other than `name` and `each`, or a bad value.',
	'bare-slot-misplaced':
		'A bare `{% slot /%}` is outside an `each` slot, iterates, or has fallback.',
	'slot-inside-each': 'A named slot is placed inside an `each` slot.',
	'slot-unknown-field': 'A slot names no field of the content model.',
	'slot-placed-twice': 'The same slot is placed twice.',
	'each-on-single-field': '`each` is used on a field that holds one value, not a list.',
	'each-item-unplaced': 'An `each` slot never places its item with a bare `{% slot /%}`.',
	'field-unplaced': 'A content-model field is placed by no slot.',
	'metablock-invalid':
		'A `{% metablock %}` is malformed: no name, content, an extra attribute, or inline.',
	'metablock-inside-each': 'A `{% metablock %}` is placed inside an `each` slot.',
	'metablock-undeclared': 'A `{% metablock %}` names no declared block.',
	'metablock-placed-twice': 'The same meta block is placed twice.',

	// Across the catalog, once every rune is loaded
	'composition-cycle': 'A composed rune places itself, directly or through another.',
	'parent-required': 'The template places a rune that requires a parent it does not get.',
	'peer-schema-type': 'A rune declaring a schema type places a rune declaring a peer type.',

	// Where definitions are loaded from
	'file-name-invalid': 'A `.md` file in a rune directory is not named `<rune>.md`.',
	'file-unreadable': 'A definition file is listed but cannot be read.',
	'rune-dir-invalid': 'A plugin’s `runeDir` is not a path inside its package.',
	'rune-dir-unreadable': 'A plugin’s declared rune directory cannot be read.',
	'rune-dir-empty': 'A plugin’s declared rune directory holds no definitions.',
	'package-unresolvable': 'A plugin’s `<pkg>/package.json` does not resolve.',
	'rune-defined-twice': 'A plugin defines a rune in its `runeDir` and in `Plugin.runes`.',
	'project-schema': 'A project definition declares `schema`.',
	'project-core-name': 'A project rune takes a core rune’s name or alias.',
	'project-plugin-name': 'A project rune takes a plugin rune’s name with no `runes.prefer` entry.',
	'local-definition': '`runes.local` is given a composed rune definition.',
	'template-entry-invalid':
		'A `Plugin.runes` entry’s `template` is not a definition string, or sits beside a `transform` or a theme config.',
} as const;

export type CompositionErrorCode = keyof typeof COMPOSITION_ERRORS;

/**
 * A definition or template the compiler rejects. `code` is its entry in
 * {@link COMPOSITION_ERRORS}; `line` is the 1-based line in the definition's
 * source where the problem is, when it can be located: the template node it
 * names, or the frontmatter key it is about. `refrakt validate` reports both
 * with the file (SPEC-153, WORK-634).
 */
export class CompositionError extends Error {
	code?: CompositionErrorCode;
	line?: number;
	/** 0-based line within the template body; mapped to `line` by the caller
	 *  that knows where the body starts in the file. */
	bodyLine?: number;

	constructor(code: CompositionErrorCode, message: string) {
		super(message);
		this.name = 'CompositionError';
		this.code = code;
	}
}
