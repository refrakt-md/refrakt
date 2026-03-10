import type { RuneConfig } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	Playlist: {
		block: 'playlist',
		modifiers: {
			type: { source: 'meta', default: 'album' },
		},
		structure: {
			header: {
				tag: 'div', before: true,
				children: [
					{ tag: 'span', ref: 'type-badge', metaText: 'type' },
				],
			},
		},
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
