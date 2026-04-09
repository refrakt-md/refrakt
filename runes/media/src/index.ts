import type { RunePackage } from '@refrakt-md/types';
import { playlist } from './tags/playlist.js';
import { track } from './tags/track.js';
import { audio } from './tags/audio.js';
import { config } from './config.js';

export const media: RunePackage = {
  name: 'media',
  displayName: 'Media',
  version: '0.9.3',
  runes: {
    'playlist': {
      transform: playlist,
      description: 'Playlist with track listing — albums, podcasts, audiobooks, mixes',
      reinterprets: { heading: 'playlist name', list: 'track listing', image: 'cover art' },
      seoType: 'MusicPlaylist',
      category: 'Semantic',
      snippet: ['{% playlist type="${1|album,podcast,audiobook,series,mix|}" artist="${2:Artist}" %}', '# ${3:Playlist Name}', '', '- **${4:Track One}** (${5:3:45})', '- **${6:Track Two}** (${7:4:20})', '{% /playlist %}'],
      fixture: `{% playlist type="album" artist="Pink Floyd" %}
# The Dark Side of the Moon

![Cover](/images/dsotm.jpg)

1. **Speak to Me** (1:13)
2. **Breathe** (2:43)
3. **On the Run** (3:36)
{% /playlist %}`,
    },
    'track': {
      transform: track,
      description: 'Individual track with metadata — for use inside playlist or standalone',
      seoType: 'MusicRecording',
      category: 'Semantic',
      snippet: ['{% track src="${1:audio.mp3}" artist="${2:Artist}" duration="${3:3:45}" %}', '# ${4:Track Name}', '{% /track %}'],
      fixture: `{% track src="/audio/breathe.mp3" artist="Pink Floyd" duration="PT2M43S" %}
Breathe
{% /track %}`,
    },
    'audio': {
      transform: audio,
      description: 'Audio player — standalone or connected to a playlist',
      category: 'Semantic',
      snippet: ['{% audio src="${1:audio.mp3}" title="${2:Title}" /%}'],
      fixture: `{% audio src="/audio/interview.mp3" title="Interview" waveform %}
Recorded on January 15, 2025.

1. Introduction (0:00)
2. Early career (4:30)
3. Founding the company (18:00)
{% /audio %}`,
    },

    // Legacy aliases
    'music-playlist': {
      transform: playlist,
      aliases: ['music-playlist'],
      description: 'Music playlist with track listing (legacy name — use playlist)',
      seoType: 'MusicPlaylist',
      fixture: `{% music-playlist %}
# Album Title

- **Track One** (3:42)
- **Track Two** (4:15)
{% /music-playlist %}`,
    },
    'music-recording': {
      transform: track,
      aliases: ['music-recording'],
      description: 'Individual music track metadata (legacy name — use track)',
      seoType: 'MusicRecording',
      fixture: `{% music-recording src="/audio/track.mp3" artist="Artist" duration="PT3M" %}
Track Name
{% /music-recording %}`,
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default media;

export type { TrackProps, AudioProps, PlaylistProps } from './props.js';
