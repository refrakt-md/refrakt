import { PageSection } from "@refrakt-md/types";

export class MusicRecording {
  name: string = '';
  byArtist: string = '';
  duration: string = '';
  copyrightYear: number | undefined;
}

export class MusicPlaylist extends PageSection {
  image: string | undefined = undefined;
  track: MusicRecording[] = [];
}
