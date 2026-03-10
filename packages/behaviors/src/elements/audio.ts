/**
 * <rf-audio> — interactive audio player with optional waveform and chapter markers.
 *
 * Reads track data from a child <script type="application/json"> element.
 * Supports waveform visualisation via wavesurfer.js (loaded from CDN when waveform="true").
 * Can connect to a named playlist rune via the playlist attribute.
 *
 * Progressive enhancement: without JS the element is inert; connectedCallback
 * builds the full player UI.
 */
import { SafeHTMLElement } from './ssr-safe.js';

interface TrackData {
	src: string;
	name: string;
	artist: string;
	chapters?: ChapterData[];
}

interface ChapterData {
	name: string;
	time: number; // seconds
}

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="7,4 20,12 7,20"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/></svg>';

export class RfAudio extends SafeHTMLElement {
	private audioEl: HTMLAudioElement | null = null;
	private wavesurfer: any = null;
	private tracks: TrackData[] = [];
	private currentTrackIndex = 0;
	private isPlaying = false;
	private animationFrameId: number | null = null;
	private useWaveform = false;

	// DOM references
	private playBtn: HTMLButtonElement | null = null;
	private progressContainer: HTMLElement | null = null;
	private progressBar: HTMLElement | null = null;
	private currentTimeEl: HTMLElement | null = null;
	private durationEl: HTMLElement | null = null;
	private trackNameEl: HTMLElement | null = null;
	private trackArtistEl: HTMLElement | null = null;
	private chapterListEl: HTMLElement | null = null;
	private waveformContainer: HTMLElement | null = null;

	connectedCallback() {
		// Defer to ensure sibling elements (e.g. playlist rune) are in the DOM
		requestAnimationFrame(() => this.init());
	}

	disconnectedCallback() {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		if (this.audioEl) {
			this.audioEl.pause();
			this.audioEl.removeAttribute('src');
			this.audioEl.load();
			this.audioEl = null;
		}
		if (this.wavesurfer) {
			try { this.wavesurfer.destroy(); } catch { /* already destroyed */ }
			this.wavesurfer = null;
		}
		this.playBtn = null;
		this.progressContainer = null;
		this.progressBar = null;
		this.currentTimeEl = null;
		this.durationEl = null;
		this.trackNameEl = null;
		this.trackArtistEl = null;
		this.chapterListEl = null;
		this.waveformContainer = null;
	}

	private init() {
		this.tracks = this.extractTrackData();

		if (this.tracks.length === 0) {
			this.tracks = this.resolvePlaylistTracks();
		}

		if (this.tracks.length === 0) return;

		this.useWaveform = this.getAttribute('waveform') === 'true';
		this.buildPlayerUI();

		const track = this.tracks[this.currentTrackIndex];
		if (!track?.src) return;

		if (this.useWaveform) {
			this.initWaveform();
		} else {
			this.initAudio();
		}
	}

	private extractTrackData(): TrackData[] {
		const script = this.querySelector('script[type="application/json"]');
		if (!script?.textContent) return [];
		try {
			return JSON.parse(script.textContent);
		} catch {
			return [];
		}
	}

	private resolvePlaylistTracks(): TrackData[] {
		const playlistId = this.getAttribute('playlist');
		if (!playlistId) return [];

		// Find the playlist section with a matching id meta
		const playlists = document.querySelectorAll<HTMLElement>('[typeof="MusicPlaylist"]');
		let playlistEl: HTMLElement | null = null;
		for (const pl of playlists) {
			const idMeta = pl.querySelector<HTMLMetaElement>('meta[data-field="id"]');
			if (idMeta?.content === playlistId) {
				playlistEl = pl;
				break;
			}
		}
		if (!playlistEl) return [];

		const tracks: TrackData[] = [];
		const trackItems = playlistEl.querySelectorAll<HTMLElement>('li[data-rune="track"]');
		for (const item of trackItems) {
			const name = item.querySelector('[data-name="track-name"]')?.textContent || '';
			const artist = item.querySelector('[data-name="track-artist"]')?.textContent || '';
			const src = item.dataset.src || '';
			tracks.push({ src, name, artist });
		}
		return tracks;
	}

	private buildPlayerUI() {
		const track = this.tracks[this.currentTrackIndex];
		if (!track) return;

		const player = document.createElement('div');
		player.className = 'rf-audio-player';

		// Track info
		if (track.name || track.artist) {
			const info = document.createElement('div');
			info.className = 'rf-audio-player__info';

			if (track.name) {
				this.trackNameEl = document.createElement('span');
				this.trackNameEl.className = 'rf-audio-player__name';
				this.trackNameEl.textContent = track.name;
				info.appendChild(this.trackNameEl);
			}
			if (track.artist) {
				this.trackArtistEl = document.createElement('span');
				this.trackArtistEl.className = 'rf-audio-player__artist';
				this.trackArtistEl.textContent = track.artist;
				info.appendChild(this.trackArtistEl);
			}
			player.appendChild(info);
		}

		// Controls row
		const controls = document.createElement('div');
		controls.className = 'rf-audio-player__controls';

		// Play/pause button
		this.playBtn = document.createElement('button');
		this.playBtn.className = 'rf-audio-player__play';
		this.playBtn.type = 'button';
		this.playBtn.setAttribute('aria-label', 'Play');
		this.playBtn.innerHTML = PLAY_ICON;
		this.playBtn.addEventListener('click', () => this.togglePlayPause());
		if (!track.src) this.playBtn.disabled = true;
		controls.appendChild(this.playBtn);

		// Current time
		this.currentTimeEl = document.createElement('span');
		this.currentTimeEl.className = 'rf-audio-player__time rf-audio-player__time--current';
		this.currentTimeEl.textContent = '0:00';
		controls.appendChild(this.currentTimeEl);

		// Progress bar
		this.progressContainer = document.createElement('div');
		this.progressContainer.className = 'rf-audio-player__progress';
		this.progressContainer.setAttribute('role', 'slider');
		this.progressContainer.setAttribute('aria-label', 'Seek');
		this.progressContainer.setAttribute('aria-valuemin', '0');
		this.progressContainer.setAttribute('aria-valuemax', '100');
		this.progressContainer.setAttribute('aria-valuenow', '0');
		this.progressContainer.tabIndex = 0;

		this.progressBar = document.createElement('div');
		this.progressBar.className = 'rf-audio-player__progress-bar';
		this.progressContainer.appendChild(this.progressBar);

		this.progressContainer.addEventListener('click', (e) => {
			const rect = this.progressContainer!.getBoundingClientRect();
			const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			this.seek(fraction);
		});

		this.progressContainer.addEventListener('keydown', (e) => {
			const step = 5; // seconds
			if (e.key === 'ArrowRight') {
				e.preventDefault();
				this.seekToTime(this.getCurrentTime() + step);
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				this.seekToTime(Math.max(0, this.getCurrentTime() - step));
			} else if (e.key === 'Home') {
				e.preventDefault();
				this.seekToTime(0);
			} else if (e.key === 'End') {
				e.preventDefault();
				this.seekToTime(this.getDuration());
			}
		});

		controls.appendChild(this.progressContainer);

		// Duration
		this.durationEl = document.createElement('span');
		this.durationEl.className = 'rf-audio-player__time rf-audio-player__time--duration';
		this.durationEl.textContent = '0:00';
		controls.appendChild(this.durationEl);

		player.appendChild(controls);

		// Waveform container (only when waveform is enabled)
		if (this.useWaveform && track.src) {
			this.waveformContainer = document.createElement('div');
			this.waveformContainer.className = 'rf-audio-player__waveform';
			player.appendChild(this.waveformContainer);
		}

		// Chapter list
		const chapters = track.chapters;
		if (chapters && chapters.length > 0) {
			this.chapterListEl = document.createElement('ol');
			this.chapterListEl.className = 'rf-audio-player__chapters';
			this.chapterListEl.setAttribute('role', 'list');

			for (const ch of chapters) {
				const li = document.createElement('li');
				const btn = document.createElement('button');
				btn.className = 'rf-audio-player__chapter';
				btn.type = 'button';
				btn.dataset.time = String(ch.time);
				btn.addEventListener('click', () => {
					this.seekToTime(ch.time);
					if (!this.isPlaying) this.togglePlayPause();
				});

				const nameSpan = document.createElement('span');
				nameSpan.className = 'rf-audio-player__chapter-name';
				nameSpan.textContent = ch.name;
				btn.appendChild(nameSpan);

				const timeSpan = document.createElement('span');
				timeSpan.className = 'rf-audio-player__chapter-time';
				timeSpan.textContent = this.formatTime(ch.time);
				btn.appendChild(timeSpan);

				li.appendChild(btn);
				this.chapterListEl.appendChild(li);
			}

			player.appendChild(this.chapterListEl);
		}

		// Insert player before script tag (which is invisible)
		this.prepend(player);
	}

	private initAudio() {
		const track = this.tracks[this.currentTrackIndex];
		if (!track?.src) return;

		this.audioEl = document.createElement('audio');
		this.audioEl.preload = 'metadata';
		this.audioEl.src = track.src;

		this.audioEl.addEventListener('loadedmetadata', () => {
			if (this.durationEl && this.audioEl) {
				this.durationEl.textContent = this.formatTime(this.audioEl.duration);
			}
		});

		this.audioEl.addEventListener('ended', () => {
			this.isPlaying = false;
			this.updatePlayButton();
			if (this.currentTrackIndex < this.tracks.length - 1) {
				this.loadTrack(this.currentTrackIndex + 1);
				this.togglePlayPause();
			}
		});

		this.startProgressLoop();
	}

	private async initWaveform() {
		const track = this.tracks[this.currentTrackIndex];
		if (!this.waveformContainer || !track?.src) {
			// Waveform requested but no src — fall back to standard player
			this.useWaveform = false;
			this.initAudio();
			return;
		}

		try {
			const cdn = 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js';
			const WaveSurfer = (await import(/* @vite-ignore */ cdn)).default;

			this.wavesurfer = WaveSurfer.create({
				container: this.waveformContainer,
				waveColor: 'var(--rf-color-border, #d1d5db)',
				progressColor: 'var(--rf-color-primary, #3b82f6)',
				cursorColor: 'var(--rf-color-primary, #3b82f6)',
				barWidth: 2,
				barRadius: 2,
				barGap: 1,
				height: 48,
				url: track.src,
			});

			this.wavesurfer.on('ready', () => {
				if (this.durationEl) {
					this.durationEl.textContent = this.formatTime(this.wavesurfer.getDuration());
				}
			});

			this.wavesurfer.on('audioprocess', () => {
				this.updateWaveformProgress();
			});

			this.wavesurfer.on('seeking', () => {
				this.updateWaveformProgress();
			});

			this.wavesurfer.on('play', () => {
				this.isPlaying = true;
				this.updatePlayButton();
			});

			this.wavesurfer.on('pause', () => {
				this.isPlaying = false;
				this.updatePlayButton();
			});

			this.wavesurfer.on('finish', () => {
				this.isPlaying = false;
				this.updatePlayButton();
			});
		} catch {
			// CDN load failed or CORS issue — fall back to standard audio
			console.warn('Audio rune: wavesurfer.js failed to load, falling back to standard player');
			this.waveformContainer.style.display = 'none';
			this.useWaveform = false;
			// Show the progress bar again
			if (this.progressContainer) this.progressContainer.style.display = '';
			if (this.currentTimeEl) this.currentTimeEl.style.display = '';
			if (this.durationEl) this.durationEl.style.display = '';
			this.initAudio();
		}
	}

	private togglePlayPause() {
		if (this.useWaveform && this.wavesurfer) {
			this.wavesurfer.playPause();
		} else if (this.audioEl) {
			if (this.isPlaying) {
				this.audioEl.pause();
				this.isPlaying = false;
			} else {
				this.audioEl.play().catch(() => { /* autoplay blocked */ });
				this.isPlaying = true;
			}
			this.updatePlayButton();
		}
	}

	private seek(fraction: number) {
		if (this.useWaveform && this.wavesurfer) {
			this.wavesurfer.seekTo(fraction);
		} else if (this.audioEl && this.audioEl.duration) {
			this.audioEl.currentTime = fraction * this.audioEl.duration;
			this.updateProgressBar();
		}
	}

	private seekToTime(seconds: number) {
		const duration = this.getDuration();
		if (duration > 0) {
			this.seek(Math.max(0, Math.min(1, seconds / duration)));
		}
	}

	private getCurrentTime(): number {
		if (this.useWaveform && this.wavesurfer) {
			return this.wavesurfer.getCurrentTime() ?? 0;
		}
		return this.audioEl?.currentTime ?? 0;
	}

	private getDuration(): number {
		if (this.useWaveform && this.wavesurfer) {
			return this.wavesurfer.getDuration() ?? 0;
		}
		return this.audioEl?.duration ?? 0;
	}

	private startProgressLoop() {
		const update = () => {
			this.updateProgressBar();
			this.animationFrameId = requestAnimationFrame(update);
		};
		this.animationFrameId = requestAnimationFrame(update);
	}

	private updateProgressBar() {
		if (!this.audioEl) return;
		const current = this.audioEl.currentTime;
		const duration = this.audioEl.duration || 0;
		const fraction = duration > 0 ? current / duration : 0;

		if (this.progressBar) {
			this.progressBar.style.width = `${fraction * 100}%`;
		}
		if (this.progressContainer) {
			this.progressContainer.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
		}
		if (this.currentTimeEl) {
			this.currentTimeEl.textContent = this.formatTime(current);
		}
		this.updateActiveChapter(current);
	}

	private updateWaveformProgress() {
		if (!this.wavesurfer) return;
		const current = this.wavesurfer.getCurrentTime() ?? 0;
		if (this.currentTimeEl) {
			this.currentTimeEl.textContent = this.formatTime(current);
		}
		this.updateActiveChapter(current);
	}

	private updateActiveChapter(currentTime: number) {
		if (!this.chapterListEl) return;
		const chapters = this.tracks[this.currentTrackIndex]?.chapters;
		if (!chapters || chapters.length === 0) return;

		// Find the active chapter (last one whose time <= currentTime)
		let activeIndex = -1;
		for (let i = chapters.length - 1; i >= 0; i--) {
			if (chapters[i].time <= currentTime) {
				activeIndex = i;
				break;
			}
		}

		const buttons = this.chapterListEl.querySelectorAll('.rf-audio-player__chapter');
		for (let i = 0; i < buttons.length; i++) {
			buttons[i].classList.toggle('rf-audio-player__chapter--active', i === activeIndex);
		}
	}

	private updatePlayButton() {
		if (!this.playBtn) return;
		this.playBtn.innerHTML = this.isPlaying ? PAUSE_ICON : PLAY_ICON;
		this.playBtn.setAttribute('aria-label', this.isPlaying ? 'Pause' : 'Play');
	}

	private loadTrack(index: number) {
		if (index < 0 || index >= this.tracks.length) return;
		this.currentTrackIndex = index;
		const track = this.tracks[index];

		if (this.trackNameEl) this.trackNameEl.textContent = track.name;
		if (this.trackArtistEl) this.trackArtistEl.textContent = track.artist;

		if (this.useWaveform && this.wavesurfer) {
			this.wavesurfer.load(track.src);
		} else if (this.audioEl) {
			this.audioEl.src = track.src;
			this.audioEl.load();
		}
	}

	private formatTime(seconds: number): string {
		if (!isFinite(seconds) || seconds < 0) return '0:00';
		const s = Math.floor(seconds);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		const pad = (n: number) => String(n).padStart(2, '0');
		return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
	}
}
