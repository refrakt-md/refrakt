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
      fixture: `{% music-playlist audio="/audio/album.mp3" %}
# Album Title

![Album Cover](/images/cover.jpg)

- Track One | 3:42
- Track Two | 4:15
{% /music-playlist %}`,
    },
    'music-recording': {
      transform: musicRecording,
      description: 'Individual music track metadata',
      seoType: 'MusicRecording',
      fixture: `{% music-recording title="Moonlight Sonata" artist="Beethoven" duration="PT15M" genre="Classical" /%}`,
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default media;
