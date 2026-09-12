import type { Plugin } from '@refrakt-md/types';
import { playlist } from './tags/playlist.js';
import { track } from './tags/track.js';
import { audio } from './tags/audio.js';
import { config } from './config.js';

export const media: Plugin = {
  name: 'media',
  displayName: 'Media',
  version: '0.32.0',
  runes: {
    'playlist': {
      transform: playlist,
      // `music-playlist` is the schema.org name, kept as a legacy spelling. It is
      // an *alias*, not a second registration: registering it separately made it
      // a distinct rune carrying a self-referential `aliases: ['music-playlist']`,
      // which printed "Aliases: music-playlist" in the reference and duplicated
      // every playlist attribute under a second name in the JSON dump (BUG-009).
      aliases: ['music-playlist'],
      description: 'Playlist with track listing — albums, podcasts, audiobooks, mixes',
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
      /** `music-recording` is the schema.org spelling — see the note on `playlist`. */
      aliases: ['music-recording'],
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

  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default media;

export type { TrackProps, AudioProps, PlaylistProps } from './props.js';
