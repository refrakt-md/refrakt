import { ComponentType } from "../interfaces.js";
import { PageSection, PageSectionProperties } from "./page.js";

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

export interface MusicRecordingComponent extends ComponentType<MusicRecording> {
  tag: 'div' | 'li',
  properties: {
    name: 'h1',
    byArtist: 'span',
    duration: 'span',
    copyrightYear: 'span',
  }
}

export interface MusicPlaylistProperties extends PageSectionProperties {
  image: 'img',
  track: 'li',
}

export interface MusicPlaylistComponent extends ComponentType<MusicPlaylist> {
  tag: 'section',
  properties: MusicPlaylistProperties,
  refs: {
    tracks: 'ol',
  }
}
