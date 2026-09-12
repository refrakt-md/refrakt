import type { RuneConfig } from '@refrakt-md/transform';
import { resolveValign } from '@refrakt-md/transform';

// SPEC-125 Phase 2 — the join tables (`sections`, `mediaSlots`, `frameTarget`)
// are declared in the tag modules that own them and referenced here. Config
// points at rune identity; it does not define it (ADR-028). The engine's read
// path is unchanged — it still reads `config.sections` and friends.
import { audioSections } from './tags/audio.js';
import { playlistMediaSlots, playlistSections } from './tags/playlist.js';

export const config: Record<string, RuneConfig> = {
	Playlist: {
		block: 'playlist',
		defaultDensity: 'full',
		defaultElevation: 'flat',
		sequence: 'numbered',
		staggerItems: 'track',
		sections: playlistSections,
		provides: ['prose'],
		mediaSlots: playlistMediaSlots,
		modifiers: {
			type: { source: 'meta', default: 'album' },
			'media-position': { source: 'meta', default: 'top', noBemClass: true },
			'media-ratio': { source: 'meta', noBemClass: true },
			valign: { source: 'meta', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
			artist: { source: 'meta', noBemClass: true },
			hasPlayer: { source: 'meta', noBemClass: true },
			id: { source: 'meta', noBemClass: true },
		},
		styles: {
			valign: { prop: '--split-valign', transform: resolveValign },
		},
		metaFields: {
			type: { metaType: 'category' },
		},
		blocks: {
			eyebrow: { fields: ['type'], layout: 'bar' },
		},
		// SPEC-081: the transform emits flat slots; `layout` builds the skeleton.
		// The split sees media + content; the content column wraps the eyebrow
		// bar, preamble header, player, tracks, and any trailing body.
		layout: {
			root: ['media', 'content'],
			content: { tag: 'div', children: ['eyebrow', 'preamble', 'player', 'tracks', 'body'] },
			preamble: { tag: 'header', children: ['headline', 'blurb', 'image'] },
		},
		autoLabel: {
			eyebrow: 'eyebrow',
			headline: 'headline',
			blurb: 'blurb',
			image: 'image',
			media: 'media',
		},
		editHints: { headline: 'inline', blurb: 'inline', preamble: 'none', tracks: 'none', player: 'none' },
	},
	Track: { block: 'track', parent: 'Playlist', defaultElevation: 'flat', editHints: { 'track-name': 'inline', 'track-artist': 'inline', 'track-description': 'inline', 'track-duration': 'none', 'track-meta': 'none' } },
	Audio: {
		block: 'audio',
		defaultDensity: 'compact',
		sections: audioSections,
		modifiers: {
			waveform: { source: 'meta', default: 'false' },
		},
		editHints: { description: 'inline' },
	},

	// No `MusicPlaylist` / `MusicRecording` entries: the schema.org spellings are
	// aliases of `playlist` / `track`, so they emit `data-rune="playlist"` and
	// resolve to the primary's config. They used to need their own entries only
	// because they were registered as separate runes — which also made them
	// diverge from what they aliased (WORK-537 had to copy the join tables across
	// to stop `{% music-playlist %}` rendering without its section roles). BUG-009
	// removed the duplicate registration, so there is nothing left to keep in
	// sync.
};
