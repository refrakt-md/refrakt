import { useSchema } from '@refrakt-md/types';
import { MusicPlaylist, MusicPlaylistComponent, MusicRecording, MusicRecordingComponent } from './schema/audio.js';

export const schema = {
  MusicPlaylist: useSchema(MusicPlaylist).defineType<MusicPlaylistComponent>('MusicPlaylist', {
    schema: 'http://schema.org/',
    MusicPlaylist: 'schema:MusicPlaylist',
    headline: 'schema:name schema:headline',
    image: 'schema:image',
    track: 'schema:track',
  }),
  MusicRecording: useSchema(MusicRecording).defineType<MusicRecordingComponent>('MusicRecording', {
    schema: 'http://schema.org/',
    MusicRecording: 'schema:MusicRecording',
    name: 'schema:name',
    byArtist: 'schema:byArtist',
    duration: 'schema:duration',
    copyrightYear: 'schema:copyrightYear',
  }),
};
