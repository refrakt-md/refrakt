import type { RuneConfig } from '@refrakt-md/transform';
import { resolveValign } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Playlist: {
		block: 'playlist',
		defaultDensity: 'full',
		sequence: 'numbered',
		sections: { preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' },
		mediaSlots: { media: 'cover' },
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
	Track: { block: 'track', parent: 'Playlist', editHints: { 'track-name': 'inline', 'track-artist': 'inline', 'track-description': 'inline', 'track-duration': 'none', 'track-meta': 'none' } },
	Audio: {
		block: 'audio',
		defaultDensity: 'compact',
		sections: { description: 'description' },
		modifiers: {
			waveform: { source: 'meta', default: 'false' },
		},
		editHints: { description: 'inline' },
	},

	// Legacy aliases
	MusicPlaylist: { block: 'playlist' },
	MusicRecording: { block: 'track', parent: 'MusicPlaylist' },
};
