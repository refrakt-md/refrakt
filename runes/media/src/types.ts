import {useSchema} from '@refrakt-md/types';
import {MusicPlaylist, MusicRecording} from './schema/audio.js';

export const schema = {
  MusicPlaylist: useSchema(MusicPlaylist).defineType('MusicPlaylist', {
    schema: 'http://schema.org/',
    MusicPlaylist: 'schema:MusicPlaylist',
    headline: 'schema:name schema:headline',
    image: 'schema:image',
    track: 'schema:track',
  }, 'MusicPlaylist'),
  MusicRecording: useSchema(MusicRecording).defineType('MusicRecording', {
    schema: 'http://schema.org/',
    MusicRecording: 'schema:MusicRecording',
    name: 'schema:name',
    byArtist: 'schema:byArtist',
    duration: 'schema:duration',
    copyrightYear: 'schema:copyrightYear',
  }, 'MusicRecording'),
};
