import type { RuneConfig } from '@refrakt-md/transform';
import { ratioToFr, resolveValign, resolveGap } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Playlist: {
		block: 'playlist',
		modifiers: {
			type: { source: 'meta', default: 'album' },
			layout: { source: 'meta', default: 'stacked' },
			ratio: { source: 'meta', default: '1 1', noBemClass: true },
			valign: { source: 'meta', default: 'top', noBemClass: true },
			gap: { source: 'meta', default: 'default', noBemClass: true },
			collapse: { source: 'meta', noBemClass: true },
		},
		styles: {
			ratio: { prop: '--split-ratio', transform: ratioToFr },
			valign: { prop: '--split-valign', transform: resolveValign },
			gap: { prop: '--split-gap', transform: resolveGap },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'type-badge', metaText: 'type' },
				],
			},
		},
		autoLabel: { media: 'media' },
	},
	Track: { block: 'track', parent: 'Playlist' },
	Audio: {
		block: 'audio',
		modifiers: {
			waveform: { source: 'meta', default: 'false' },
		},
	},

	// Legacy aliases
	MusicPlaylist: { block: 'playlist' },
	MusicRecording: { block: 'track', parent: 'MusicPlaylist' },
};
