import type { RuneConfig } from '@refrakt-md/transform';

export const config: Record<string, RuneConfig> = {
	MusicPlaylist: { block: 'music-playlist' },
	MusicRecording: { block: 'music-recording', parent: 'MusicPlaylist' },
};
