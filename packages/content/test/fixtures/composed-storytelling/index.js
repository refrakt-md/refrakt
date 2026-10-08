/**
 * A fixture plugin whose runes are all composed definitions in a declared rune
 * directory (SPEC-153 D2). `runes/` holds the same `bond` and `character`
 * definitions the composed-storytelling tests measure against the storytelling
 * plugin, and `fixtures/` their fixtures (D9). The pack harness proves the
 * directory survives `npm pack` → install → load.
 */
export const composedStorytelling = {
	name: 'composed-storytelling',
	displayName: 'Composed storytelling (fixture)',
	version: '0.0.0',
	runeDir: 'runes',
	runes: {},
};

export default composedStorytelling;
