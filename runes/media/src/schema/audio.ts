import { PageSection } from "@refrakt-md/types";

export class Track {
  name: string = '';
  artist: string = '';
  duration: string = '';
  src: string = '';
  date: string = '';
  number: number | undefined;
  trackType: string = 'song';
}

export class Playlist extends PageSection {
  image: string | undefined = undefined;
  artist: string = '';
  playlistType: string = 'album';
  track: Track[] = [];
}

export class Audio {
  src: string = '';
  title: string = '';
  artist: string = '';
  waveform: boolean = false;
}

// Legacy aliases
export { Track as MusicRecording };
export { Playlist as MusicPlaylist };
