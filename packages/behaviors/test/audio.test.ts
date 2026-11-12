/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RfAudio } from '../src/elements/audio.js';

beforeEach(() => {
	document.body.innerHTML = '';
	if (!customElements.get('rf-audio')) customElements.define('rf-audio', RfAudio);
	// jsdom does not implement media playback.
	vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
	vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
	vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

/** A playlist as the media plugin renders it, and a player bound to it by id. */
function mountPlaylist(): { tracks: HTMLElement[]; player: HTMLElement } {
	document.body.innerHTML = `
		<section typeof="MusicPlaylist" data-rune="playlist" class="rf-playlist">
			<meta data-field="id" content="mix">
			<ol>
				<li data-rune="track" class="rf-track" data-src="/a.mp3"><span data-name="track-name">A</span></li>
				<li data-rune="track" class="rf-track" data-src="/b.mp3"><span data-name="track-name">B</span></li>
			</ol>
		</section>
		<rf-audio playlist="mix"></rf-audio>`;
	return {
		tracks: [...document.querySelectorAll<HTMLElement>('li[data-rune="track"]')],
		player: document.querySelector<HTMLElement>('rf-audio')!,
	};
}

describe('rf-audio playlist tracks (SPEC-196 D6)', () => {
	it('marks the current track with data-state and writes no class on it', async () => {
		const { tracks } = mountPlaylist();
		const before = tracks.map((t) => t.className);
		await frame();

		expect(tracks.map((t) => t.getAttribute('data-state'))).toEqual(['active', 'inactive']);

		tracks[1].click();
		expect(tracks.map((t) => t.getAttribute('data-state'))).toEqual(['inactive', 'active']);
		expect(tracks.map((t) => t.className)).toEqual(before);
	});

	it('clears the state when the player is removed', async () => {
		const { tracks, player } = mountPlaylist();
		await frame();
		player.remove();
		expect(tracks.every((t) => !t.hasAttribute('data-state'))).toBe(true);
	});
});
