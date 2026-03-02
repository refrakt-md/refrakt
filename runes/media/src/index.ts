import type { RunePackage } from '@refrakt-md/types';
import { musicPlaylist } from './tags/music-playlist.js';
import { musicRecording } from './tags/music-recording.js';
import { config } from './config.js';

export const media: RunePackage = {
  name: 'media',
  displayName: 'Media',
  version: '0.6.0',
  runes: {
    'music-playlist': {
      transform: musicPlaylist,
      description: 'Music playlist with track listing',
      reinterprets: { heading: 'playlist name', list: 'track listing' },
      seoType: 'MusicPlaylist',
    },
    'music-recording': {
      transform: musicRecording,
      description: 'Individual music track metadata',
      seoType: 'MusicRecording',
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default media;
