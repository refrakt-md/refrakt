import { describe, it, expect } from 'vitest';
import { extractSeo } from '@refrakt-md/runes';
import { parse } from './helpers.js';

// WORK-572 / BUG-016 — a `{% track %}` inside a `{% playlist %}` is one of that
// playlist's tracks: in the list, in the HTML, and in the structured data.
//
// BUG-016 had three symptoms, and each gets a test here: the stray `<li>`
// rendered outside any list, the detached top-level entity, and the docs
// recommending a composition that did not work.
//
// The bar the item sets is equivalence: a nested track with no explicit `type`
// produces the same schema as the same content written as a list item. The
// fuller form may carry *more* (body, cue prose, per-track links) — it may not
// carry less.

const seo = (content: string) => extractSeo(parse(content), {} as any, '/test').jsonLd;

/** Sort object keys recursively; array order is left alone. */
function normalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalize);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const k of Object.keys(value as object).sort()) {
			out[k] = normalize((value as Record<string, unknown>)[k]);
		}
		return out;
	}
	return value;
}

const entities = (jsonLd: object[], type: string) =>
	jsonLd.filter((e) => (e as Record<string, unknown>)['@type'] === type);

/** Every `track` rune's field bag in a transformed tree, in document order. */
function trackFields(node: any, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
	if (Array.isArray(node)) {
		for (const c of node) trackFields(c, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	if (node.attributes?.['data-rune'] === 'track') {
		const raw = node.attributes['data-rune-fields'];
		out.push(typeof raw === 'string' ? JSON.parse(raw) : {});
	}
	for (const c of node.children ?? []) trackFields(c, out);
	return out;
}

const LIST_FORM = `{% playlist type="album" artist="Pink Floyd" %}
# The Dark Side of the Moon

- **Speak to Me** (1:13)
{% /playlist %}`;

const TAG_FORM = `{% playlist type="album" artist="Pink Floyd" %}
# The Dark Side of the Moon

{% track duration="1:13" %}
# Speak to Me
{% /track %}
{% /playlist %}`;

describe('playlist accepts track children (WORK-572)', () => {
	it('publishes a nested track as one of the playlist’s tracks', () => {
		// BUG-016 symptom 2: the track used to fall through to the greedy `body`
		// field and float up as its own top-level entity.
		const jsonLd = seo(TAG_FORM);
		expect(entities(jsonLd, 'MusicRecording'), 'a track floated to top level').toEqual([]);

		const playlist = entities(jsonLd, 'MusicPlaylist')[0] as Record<string, unknown>;
		expect(playlist.track, 'the playlist has no track').toBeDefined();
		expect((playlist.track as Record<string, unknown>).name).toBe('Speak to Me');
	});

	it('renders nested tracks inside the track list, not beside it', () => {
		// BUG-016 symptom 1: an `<li>` outside any list is invalid HTML.
		const tree = JSON.stringify(parse(TAG_FORM));
		const ol = tree.indexOf('"data-name":"tracks"');
		expect(ol, 'no tracks list rendered').toBeGreaterThan(-1);
		// The track's own `<li>` must appear after the `<ol>` opens — i.e. inside it.
		const li = tree.indexOf('"data-rune":"track"');
		expect(li, 'no track rendered').toBeGreaterThan(-1);
		expect(li).toBeGreaterThan(ol);
	});

	it('produces the same schema as the same content written as a list item', () => {
		// The equivalence, asserted directly. This is the whole point: the escape
		// hatch costs the author nothing.
		const asList = entities(seo(LIST_FORM), 'MusicPlaylist')[0] as Record<string, unknown>;
		const asTag = entities(seo(TAG_FORM), 'MusicPlaylist')[0] as Record<string, unknown>;
		expect(normalize(asTag.track)).toEqual(normalize(asList.track));
	});

	it('inherits the playlist artist the way a list item does', () => {
		// `track` has no artist fallback of its own, so without the parent applying
		// one the two forms disagree on `byArtist`.
		const playlist = entities(seo(TAG_FORM), 'MusicPlaylist')[0] as Record<string, unknown>;
		expect((playlist.track as Record<string, unknown>).byArtist).toBe('Pink Floyd');
	});

	it('lets a track keep its own artist over the playlist default', () => {
		const content = `{% playlist type="album" artist="Pink Floyd" %}
# Mixed

{% track artist="Miles Davis" duration="9:22" %}
# So What
{% /track %}
{% /playlist %}`;
		const playlist = entities(seo(content), 'MusicPlaylist')[0] as Record<string, unknown>;
		expect((playlist.track as Record<string, unknown>).byArtist).toBe('Miles Davis');
	});

	it('keeps document order when both forms are mixed', () => {
		const content = `{% playlist type="album" artist="X" %}
# Mixed

- **First** (1:00)

{% track duration="2:00" %}
# Second
{% /track %}

- **Third** (3:00)
{% /playlist %}`;
		const playlist = entities(seo(content), 'MusicPlaylist')[0] as Record<string, unknown>;
		const names = (playlist.track as Record<string, unknown>[]).map((t) => t.name);
		expect(names).toEqual(['First', 'Second', 'Third']);
	});

	it('carries track-only fields the list form cannot express', () => {
		// The fuller form may carry more — that is why it exists.
		const content = `{% playlist type="album" %}
# Album

{% track number=3 url="https://example.test/track" duration="4:01" %}
# Everything in Its Right Place
{% /track %}
{% /playlist %}`;
		const track = (entities(seo(content), 'MusicPlaylist')[0] as Record<string, unknown>)
			.track as Record<string, unknown>;
		expect(track.url).toBe('https://example.test/track');
		expect(track.position).toBe('3');
		expect(track.duration).toBe('PT241S');
	});

	it('takes the playlist’s kind when the track states none', () => {
		// SPEC-130 D9 — the parent retypes its children. `type` is absent here, so
		// the podcast supplies `episode`.
		const content = `{% playlist type="podcast" %}
# Show

{% track duration="45:30" %}
# Episode One
{% /track %}
{% /playlist %}`;
		const [fields] = trackFields(parse(content));
		expect(fields, 'no track rendered').toBeDefined();
		expect(fields.type).toBe('episode');
	});

	it('honours an explicit type that contradicts its container', () => {
		// A `{% track type="song" %}` in a podcast keeps `song`. The author said so
		// explicitly, and the alternative — silently overriding — would make the
		// attribute a lie. Recorded as a decision, not an accident.
		const content = `{% playlist type="podcast" %}
# Show

{% track type="song" duration="3:00" %}
# A Song
{% /track %}
{% /playlist %}`;
		const [fields] = trackFields(parse(content));
		expect(fields.type).toBe('song');
	});

	it('still publishes a standalone track, with its artist and duration', () => {
		// These two metas were declared in `properties`/`schema` and never pushed
		// into `children`, so a standalone track published its name and nothing
		// else. Fixed here because the equivalence above cannot hold otherwise.
		const jsonLd = seo(
			`{% track artist="Radiohead" duration="4:01" type="song" %}\n# Everything in Its Right Place\n{% /track %}`,
		);
		const track = entities(jsonLd, 'MusicRecording')[0] as Record<string, unknown>;
		expect(track.name).toBe('Everything in Its Right Place');
		expect(track.byArtist).toBe('Radiohead');
		expect(track.duration).toBe('PT241S');
	});

	it('keeps the list form working unchanged', () => {
		// The `tracks` field became greedy, which had disabled its own itemModel
		// extraction until the resolver learned to handle greedy + itemModel.
		const playlist = entities(seo(LIST_FORM), 'MusicPlaylist')[0] as Record<string, unknown>;
		const track = playlist.track as Record<string, unknown>;
		expect(track.name).toBe('Speak to Me');
		expect(track.duration).toBe('PT73S');
		expect(track.byArtist).toBe('Pink Floyd');
	});
});
