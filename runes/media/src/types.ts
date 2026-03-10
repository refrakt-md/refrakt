import {useSchema} from '@refrakt-md/types';
import {Playlist, Track, Audio} from './schema/audio.js';

export const schema = {
  Playlist: useSchema(Playlist).defineType('Playlist', {
    schema: 'http://schema.org/',
    MusicPlaylist: 'schema:MusicPlaylist',
    headline: 'schema:name schema:headline',
    image: 'schema:image',
    byArtist: 'schema:byArtist',
    track: 'schema:track',
  }, 'MusicPlaylist'),
  Track: useSchema(Track).defineType('Track', {
    schema: 'http://schema.org/',
    MusicRecording: 'schema:MusicRecording',
    name: 'schema:name',
    byArtist: 'schema:byArtist',
    duration: 'schema:duration',
    url: 'schema:url',
    datePublished: 'schema:datePublished',
    position: 'schema:position',
  }, 'MusicRecording'),
  Audio: useSchema(Audio).defineType('Audio'),

  // Legacy aliases
  MusicPlaylist: useSchema(Playlist).defineType('MusicPlaylist', {
    schema: 'http://schema.org/',
    MusicPlaylist: 'schema:MusicPlaylist',
    headline: 'schema:name schema:headline',
    image: 'schema:image',
    byArtist: 'schema:byArtist',
    track: 'schema:track',
  }, 'MusicPlaylist'),
  MusicRecording: useSchema(Track).defineType('MusicRecording', {
    schema: 'http://schema.org/',
    MusicRecording: 'schema:MusicRecording',
    name: 'schema:name',
    byArtist: 'schema:byArtist',
    duration: 'schema:duration',
    url: 'schema:url',
    datePublished: 'schema:datePublished',
    position: 'schema:position',
  }, 'MusicRecording'),
};
