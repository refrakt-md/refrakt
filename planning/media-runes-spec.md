# Media Runes — Specification

> **Status:** Design proposal
> **Scope:** Playlist, track, and audio rune content models, compact format, and player integration
> **Related:** Unbuilt Runes Spec, Sandbox Futures (audio visualisation synergy)

---

## Problem

The media runes — `playlist`, `track`, `audio`, `video`, `album`, `artist` — are defined in the unbuilt runes spec with pipe-delimited compact syntax for tracks. This syntax is fragile, ambiguous, and doesn't leverage Markdown's existing formatting constructs. It also leaves the relationship between playlists and the audio player undefined — a playlist of self-hosted tracks has no clear path to integrated playback.

---

## Design Principles

**Markdown-native formatting.** Track metadata uses bold, italic, links, and parentheticals — constructs the editor already highlights and the author already knows. No pipe-delimited strings or custom field separators.

**Progressive richness.** A track can be a single line with a name and duration. Or it can carry descriptions, chapters, timestamped lyrics, and nested sub-sections. Each layer is opt-in. The simple case stays simple.

**Playlist owns the collection, audio owns the player.** The playlist rune defines what tracks exist and their metadata. The audio rune provides playback controls. They connect through an `id`/`playlist` reference, or the playlist can embed a player directly for simple cases.

---

## Compact Track Format

Each track is a list item inside a playlist. Markdown formatting identifies each field unambiguously:

| Markdown construct | Track field | Example |
|---|---|---|
| **Bold text** | Track name | `**Bohemian Rhapsody**` |
| Link wrapping the name | Audio source (`src`) | `[**Breathe**](/audio/breathe.mp3)` |
| *Italic text* | Artist | `*Queen*` |
| `(duration)` | Duration | `(5:55)` |
| Text after em-dash | Date or context | `— 2024-01-15` |

These constructs are syntactically distinct — bold, italic, link, and parenthetical cannot be confused with each other. The rune transform parses each list item by finding these Markdown elements rather than splitting on a delimiter character.

### Parsing Rules

1. Find link (if present) — extract `href` as `src`, making the track playable
2. Find bold text (inside or outside the link) — extract as track name
3. Find italic text — extract as artist (overrides playlist-level `artist` attribute)
4. Find parenthetical — extract as duration
5. Find text after em-dash — extract as date or contextual note

### Duration Format

Authors can use human-readable or ISO 8601 duration formats. The transform accepts all three and produces the same internal value:

| Format | Example | Parsed as |
|---|---|---|
| `mm:ss` | `(5:55)` | 5 minutes 55 seconds |
| `h:mm:ss` | `(1:12:00)` | 1 hour 12 minutes |
| ISO 8601 | `(PT5M55S)` | 5 minutes 55 seconds |

The `mm:ss` format is preferred for authoring because it matches how people think about track lengths.

### Track Numbers

Ordered lists provide implicit track numbering:

```markdoc
1. [**Speak to Me**](/audio/speak-to-me.mp3) (1:13)
2. [**Breathe**](/audio/breathe.mp3) (2:43)
3. [**On the Run**](/audio/on-the-run.mp3) (3:36)
```

The list index becomes the track number. Unordered lists produce unnumbered tracks.

---

## Examples by Playlist Type

### Album (self-hosted)

```markdoc
{% playlist type="album" artist="Pink Floyd" player %}
# The Dark Side of the Moon
![Cover](/images/dsotm.jpg)

1. [**Speak to Me**](/audio/speak-to-me.mp3) (1:13)
2. [**Breathe**](/audio/breathe.mp3) (2:43)
3. [**On the Run**](/audio/on-the-run.mp3) (3:36)
4. [**Time**](/audio/time.mp3) (6:53)
5. [**The Great Gig in the Sky**](/audio/great-gig.mp3) (4:47)
{% /playlist %}
```

Artist is set at the playlist level. Track names are bold, wrapped in links for playback. Durations in parentheses. The `player` attribute enables integrated playback controls.

### Album (metadata only, no playback)

```markdoc
{% playlist type="album" artist="Radiohead" %}
# OK Computer

- **Airbag** (4:44)
- **Paranoid Android** (6:23)
- **Subterranean Homesick Alien** (4:27)
- **Exit Music (For a Film)** (4:24)
- **Let Down** (4:59)
{% /playlist %}
```

No links, no `player` attribute. A pure track listing for reviews, listening logs, or discography pages.

### Mix (multiple artists)

```markdoc
{% playlist type="mix" player %}
# Road Trip Mix

- [**Bohemian Rhapsody**](/audio/bohemian.mp3) — *Queen* (5:55)
- [**Hotel California**](/audio/hotel.mp3) — *Eagles* (6:30)
- [**Stairway to Heaven**](/audio/stairway.mp3) — *Led Zeppelin* (8:02)
- [**Purple Rain**](/audio/purple-rain.mp3) — *Prince* (8:41)
{% /playlist %}
```

Each track has its own artist in italics. The em-dash separates the name/link from the artist, which reads naturally.

### Podcast

```markdoc
{% playlist type="podcast" %}
# Tech Weekly
![Podcast Art](/images/techweekly.jpg)

A weekly podcast about emerging technology.

- [**The AI Revolution**](/episodes/ai-revolution.mp3) (45:00) — 2024-01-15
- [**Quantum Computing 101**](/episodes/quantum.mp3) (38:00) — 2024-01-22
- [**The Privacy Debate**](/episodes/privacy.mp3) (52:00) — 2024-01-29
{% /playlist %}
```

Date after the em-dash. Paragraph above the track list is the podcast description.

### DJ Mix (single long file with chapters)

```markdoc
{% playlist type="mix" player %}
# Sunset Sessions Vol. 3

- [**Full Mix**](/audio/sunset-sessions-3.mp3) (2:15:00)

  Recorded live at Blue Marlin, Ibiza. August 2024.

  - Intro & Warm-up (0:00)
  - Deep House (12:30)
  - Progressive Build (45:00)
  - Peak Time (1:15:00)
  - Cool Down (1:50:00)

{% /playlist %}
```

A single track with chapters. The player shows the chapter timeline and allows jumping between sections.

---

## Rich Track Content

Tracks can carry content beyond the single-line compact format. Indented content under a list item becomes the track's body — descriptions, chapters, lyrics, and structured show notes.

### Track Descriptions

Paragraphs indented under a track become the track's description. The player can display these as expandable show notes.

```markdoc
{% playlist type="podcast" player %}
# Deep Conversations

- [**On Creativity**](/episodes/creativity.mp3) (1:24:00) — 2024-03-10

  A wide-ranging conversation about where ideas come from
  and why most creative advice is wrong. Featuring special
  guest Maria Chen, author of "The Creative Myth."

- [**On Solitude**](/episodes/solitude.mp3) (58:00) — 2024-03-17

  Why being alone isn't the same as being lonely, and how
  the most interesting people we've met guard their time
  with almost religious devotion.

{% /playlist %}
```

### Chapters

Nested list items with timestamps are chapter markers. The player syncs with them — jumping to the timestamp when the user clicks a chapter.

```markdoc
- [**On Creativity**](/episodes/creativity.mp3) (1:24:00) — 2024-03-10

  A wide-ranging conversation about where ideas come from.

  - Introduction (0:00)
  - The myth of the blank page (8:30)
  - Flow states and interruption (32:15)
  - Creative collaboration (48:00)
  - Audience questions (58:00)
  - Wrap-up (1:18:00)
```

### Chapters with Descriptions

Each chapter can carry its own description paragraphs:

```markdoc
- [**On Creativity**](/episodes/creativity.mp3) (1:24:00) — 2024-03-10

  A wide-ranging conversation about where ideas come from.

  - Introduction (0:00)

    Setting the scene. Why we wanted to revisit this topic
    after our first attempt two years ago.

  - The myth of the blank page (8:30)

    Nobody actually starts from nothing. We talk about
    constraints, influences, and the anxiety of originality.

  - Flow states and interruption (32:15)

    The science of deep focus and why open offices are
    a disaster for creative work.

  - Audience questions (58:00)

    We take listener questions about creative blocks,
    collaboration, and when to abandon a project.
```

The player shows chapter titles in the timeline. Expanding a chapter reveals its description.

### Chapter Groups with Headings

Headings inside the nested content create major sections with sub-chapters:

```markdoc
- [**The AI Revolution**](/episodes/ai-revolution.mp3) (1:45:00)

  - Introduction (0:00)

  - ### Part 1: The Current State (4:30)

    - GPT-5 and the scaling debate (4:30)
    - Open source catches up (18:00)
    - The enterprise adoption curve (29:00)

  - ### Part 2: What's Next (45:00)

    - Agents and tool use (45:00)
    - Multimodal everything (58:00)
    - The regulation question (1:12:00)

  - Wrap-up and listener questions (1:30:00)
```

Two-level hierarchy: major sections (headings) with sub-chapters. The player renders major chapters in the primary timeline and sub-chapters when a major section is expanded.

### Timestamped Lyrics

When nested list items are short (single line, no description paragraphs) and have timestamps, they're lyrics. The player highlights the current line during playback.

```markdoc
{% playlist type="album" artist="Pink Floyd" player %}
# The Dark Side of the Moon

- [**Breathe**](/audio/breathe.mp3) (2:43)

  - (0:00) Breathe, breathe in the air
  - (0:08) Don't be afraid to care
  - (0:15) Leave, but don't leave me
  - (0:22) Look around, choose your own ground

  - (0:32) Long you live and high you fly
  - (0:39) And smiles you'll give and tears you'll cry
  - (0:46) And all you touch and all you see
  - (0:52) Is all your life will ever be

- [**Time**](/audio/time.mp3) (6:53)

  - (0:00) Ticking away the moments that make up a dull day
  - (0:08) Fritter and waste the hours in an offhand way
  - (0:16) Kicking around on a piece of ground in your home town
  - (0:24) Waiting for someone or something to show you the way

{% /playlist %}
```

Blank lines between groups of lyric lines represent verse breaks. The player renders them with a visual gap.

### Lyrics vs Chapters — Automatic Detection

The rune transform distinguishes lyrics from chapters automatically based on content shape:

| Pattern | Detected as |
|---|---|
| Short text, timestamp at start `(0:00) text`, no description paragraphs | Lyric line |
| Text with timestamp at end `Chapter Name (0:00)`, optional description paragraphs | Chapter marker |
| Heading before a group of nested items | Chapter group |

The timestamp position is the primary signal: timestamp at the *start* of the text means lyrics (the time is a sync point, the text follows). Timestamp at the *end* means chapters (the name comes first, the time is metadata).

```
- (0:00) Breathe, breathe in the air     ← lyric (timestamp first)
- Introduction (0:00)                      ← chapter (timestamp last)
```

For cases where the automatic detection doesn't fit, the playlist-level `content` attribute provides an explicit override:

```markdoc
{% playlist type="album" content="lyrics" player %}
```

| Value | Behaviour |
|---|---|
| `auto` (default) | Detect from content shape |
| `lyrics` | All nested timed items are lyrics |
| `chapters` | All nested timed items are chapters |

---

## Content Model Summary

The full hierarchy of content inside a playlist:

```
playlist
├── header (heading, image, paragraphs → title, cover art, description)
│
└── tracks (list items)
    ├── track metadata (bold name, link src, italic artist, duration, date)
    ├── track description (indented paragraphs)
    │
    └── cue points (nested list items with timestamps)
        ├── lyrics (timestamp at start, short text, no body)
        │   └── verse groups (separated by blank lines)
        │
        └── chapters (timestamp at end, name first)
            ├── chapter description (indented paragraphs)
            ├── chapter group heading (### heading before items)
            └── sub-chapters (further nested list items)
```

All of this is standard Markdown list nesting with the reinterpretation pattern used throughout refrakt.md. No custom syntax beyond what Markdown already provides.

---

## Playlist and Audio Player Relationship

### The Two Runes

The **playlist** rune defines the collection — tracks, metadata, cover art, descriptions, chapters, lyrics. It's a content rune. It produces structured data and visible markup.

The **audio** rune is the player — playback controls, waveform, progress bar, chapter navigation. It's a behaviour rune. It provides the interactive playback experience.

### Three Integration Modes

**Mode 1: Integrated player.** The playlist renders its own embedded player when the `player` attribute is present. Simplest setup for a self-contained playable playlist:

```markdoc
{% playlist type="album" artist="Pink Floyd" player %}
# The Dark Side of the Moon
![Cover](/images/dsotm.jpg)

1. [**Speak to Me**](/audio/speak-to-me.mp3) (1:13)
2. [**Breathe**](/audio/breathe.mp3) (2:43)
3. [**On the Run**](/audio/on-the-run.mp3) (3:36)
{% /playlist %}
```

The playlist renders cover art, track listing, and a player bar. Clicking a track starts playback. The player is visually integrated into the playlist component. This is the default for most use cases — a music blog post, a podcast page, a DJ mix showcase.

**Mode 2: Separate player.** The playlist and audio player are separate runes connected by ID reference. The playlist displays metadata. The audio player provides controls. They can be positioned independently on the page:

```markdoc
{% playlist id="dsotm" type="album" artist="Pink Floyd" %}
# The Dark Side of the Moon
![Cover](/images/dsotm.jpg)

1. [**Speak to Me**](/audio/speak-to-me.mp3) (1:13)
2. [**Breathe**](/audio/breathe.mp3) (2:43)
3. [**On the Run**](/audio/on-the-run.mp3) (3:36)
{% /playlist %}

{% audio playlist="dsotm" waveform %}
```

The `audio` rune references the playlist by ID. It receives the full track list and provides playback controls, waveform visualisation, and track navigation. The playlist rune above renders as a static track listing (no player controls). Clicking a track in the listing tells the audio player to switch tracks.

This separation is useful when the player and metadata need different page positions — the playlist in a sidebar, the player sticky at the bottom. Or the playlist embedded in prose with the player in a different section.

**Mode 3: Standalone player.** The audio rune plays a single file with no playlist:

```markdoc
{% audio src="/audio/interview.mp3" title="Interview with the Founder" waveform %}

Recorded on January 15, 2025 in our San Francisco office.

1. Introduction (0:00)
2. Early career (4:30)
3. Founding the company (18:00)
4. Lessons learned (35:00)

{% /audio %}
```

No playlist, no track collection. A single audio file with optional chapter markers defined as an ordered list inside the rune body. The audio rune handles its own metadata and playback. This is for one-off audio embeds — an interview, a lecture, a recording.

### Player Behaviour

Regardless of integration mode, the player provides:

| Feature | Description |
|---|---|
| Play/pause | Standard playback toggle |
| Progress bar | Seekable timeline with current position and duration |
| Track navigation | Previous/next buttons when multiple tracks are present |
| Track list | Expandable list showing all tracks, current track highlighted |
| Chapter markers | Visual markers on the timeline, clickable to jump |
| Chapter list | Expandable list of chapters for the current track |
| Lyric sync | Current lyric line highlighted during playback, auto-scrolling |
| Waveform | Visual waveform display (when `waveform` attribute is present) |
| Volume control | Volume slider |
| Playback speed | Speed adjustment (0.5×, 1×, 1.25×, 1.5×, 2×) — especially useful for podcasts |

Not all features are relevant to all content types. Lyric sync only appears when lyrics are present. Chapter navigation only appears when chapters are present. Playback speed is most relevant for podcasts and audiobooks. The player adapts its UI based on the available metadata.

### Waveform Implementation

The waveform can be generated two ways:

**Client-side (default):** The Web Audio API analyses the audio file and generates waveform data when the player loads. Simple to implement but requires downloading enough of the audio file to compute the waveform. Works well for short tracks.

**Pre-computed:** A JSON file containing waveform peak data, generated at build time or upload time. The player loads the JSON instead of analysing the audio. Faster for long files. The build pipeline could generate these automatically:

```
/audio/breathe.mp3           ← audio file
/audio/breathe.waveform.json ← pre-computed waveform peaks
```

The player checks for the `.waveform.json` file alongside the audio source. If present, it uses the pre-computed data. If not, it falls back to client-side analysis.

---

## Explicit Track Tags

The compact format handles most cases. For tracks that need attributes beyond what Markdown formatting can express, explicit `{% track %}` tags provide full control:

```markdoc
{% playlist type="album" artist="Pink Floyd" player %}
# The Dark Side of the Moon
![Cover](/images/dsotm.jpg)

{% track src="/audio/speak-to-me.mp3" duration="PT1M13S" number=1 %}
Speak to Me
{% /track %}

{% track src="/audio/breathe.mp3" duration="PT2M43S" number=2 %}
Breathe

- (0:00) Breathe, breathe in the air
- (0:08) Don't be afraid to care
{% /track %}

{% /playlist %}
```

Compact format and explicit tags can be mixed in the same playlist. The rune transform handles both.

Explicit tags are recommended when:
- Track metadata doesn't fit the Markdown formatting pattern
- A track needs attributes not available in compact format (`url` for external links, custom metadata)
- The author prefers explicit attribute naming over positional formatting

---

## Playlist Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `type` | String | `'album'` | `album`, `podcast`, `audiobook`, `series`, `mix` |
| `artist` | String | — | Default artist inherited by all tracks |
| `player` | Boolean | `false` | Embed an audio player in the playlist |
| `content` | String | `'auto'` | Nested content type: `auto`, `lyrics`, `chapters` |
| `id` | String | — | ID for cross-referencing from an audio rune |

## Track Attributes (explicit tag form)

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | String | — | Audio file URL (makes the track playable) |
| `artist` | String | — | Artist (overrides playlist-level) |
| `duration` | String | — | ISO 8601 or `mm:ss` / `h:mm:ss` |
| `number` | Number | — | Track number |
| `date` | String | — | Publication date (ISO 8601) |
| `url` | String | — | External link (streaming service, website) |
| `type` | String | `'song'` | `song`, `episode`, `chapter`, `talk`, `video` |

## Audio Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | String | — | Audio file URL (standalone mode) |
| `playlist` | String | — | ID of a playlist rune (connected mode) |
| `title` | String | — | Track title (standalone mode) |
| `artist` | String | — | Artist name (standalone mode) |
| `waveform` | Boolean | `false` | Show waveform visualisation |
| `chapters` | String | — | WebVTT chapters file URL (alternative to inline chapters) |

The `src` and `playlist` attributes are mutually exclusive. One provides a single file, the other connects to a playlist collection.

---

## Schema.org Output

### Playlist

Varies by type:

| Type | Schema.org | Track type |
|---|---|---|
| `album` | `MusicPlaylist` | `MusicRecording` |
| `podcast` | `PodcastSeries` | `PodcastEpisode` |
| `audiobook` | `Audiobook` | `AudioObject` (chapters) |
| `series` | `ItemList` | `AudioObject` or `VideoObject` |
| `mix` | `MusicPlaylist` | `MusicRecording` |

### Track

Track schema.org type is derived from the parent playlist type:

```json
{
  "@type": "MusicRecording",
  "name": "Breathe",
  "byArtist": { "@type": "MusicGroup", "name": "Pink Floyd" },
  "duration": "PT2M43S",
  "audio": {
    "@type": "AudioObject",
    "contentUrl": "/audio/breathe.mp3"
  }
}
```

---

## Identity Transform

### Playlist with Integrated Player

Input:
```markdoc
{% playlist type="mix" player %}
# Road Trip Mix

- [**Bohemian Rhapsody**](/audio/bohemian.mp3) — *Queen* (5:55)
- [**Hotel California**](/audio/hotel.mp3) — *Eagles* (6:30)
{% /playlist %}
```

Output:
```html
<section class="rune-playlist rune-playlist--mix rune-playlist--has-player"
         data-type="mix">
  <div class="rune-playlist__header">
    <h2 class="rune-playlist__title">Road Trip Mix</h2>
  </div>
  <div class="rune-playlist__player">
    <!-- rf-audio web component handles playback UI -->
    <rf-audio waveform="false">
      <script type="application/json">
        [
          { "src": "/audio/bohemian.mp3", "name": "Bohemian Rhapsody", "artist": "Queen", "duration": 355 },
          { "src": "/audio/hotel.mp3", "name": "Hotel California", "artist": "Eagles", "duration": 390 }
        ]
      </script>
    </rf-audio>
  </div>
  <ol class="rune-playlist__tracks">
    <li class="rune-playlist__track" data-src="/audio/bohemian.mp3">
      <span class="rune-playlist__track-name">Bohemian Rhapsody</span>
      <span class="rune-playlist__track-artist">Queen</span>
      <span class="rune-playlist__track-duration">5:55</span>
    </li>
    <li class="rune-playlist__track" data-src="/audio/hotel.mp3">
      <span class="rune-playlist__track-name">Hotel California</span>
      <span class="rune-playlist__track-artist">Eagles</span>
      <span class="rune-playlist__track-duration">6:30</span>
    </li>
  </ol>
</section>
```

The `rf-audio` web component receives track data as JSON and handles all playback behaviour. The track list items are interactive — clicking one tells the player to switch tracks.

### Track with Chapters

Input:
```markdoc
- [**On Creativity**](/episodes/creativity.mp3) (1:24:00)

  A conversation about where ideas come from.

  - Introduction (0:00)

    Setting the scene.

  - The myth of the blank page (8:30)

    Nobody starts from nothing.
```

Output (within playlist):
```html
<li class="rune-playlist__track" data-src="/episodes/creativity.mp3">
  <div class="rune-playlist__track-meta">
    <span class="rune-playlist__track-name">On Creativity</span>
    <span class="rune-playlist__track-duration">1:24:00</span>
  </div>
  <p class="rune-playlist__track-description">
    A conversation about where ideas come from.
  </p>
  <ol class="rune-playlist__chapters">
    <li class="rune-playlist__chapter" data-time="0">
      <span class="rune-playlist__chapter-name">Introduction</span>
      <span class="rune-playlist__chapter-time">0:00</span>
      <p class="rune-playlist__chapter-description">Setting the scene.</p>
    </li>
    <li class="rune-playlist__chapter" data-time="510">
      <span class="rune-playlist__chapter-name">The myth of the blank page</span>
      <span class="rune-playlist__chapter-time">8:30</span>
      <p class="rune-playlist__chapter-description">Nobody starts from nothing.</p>
    </li>
  </ol>
</li>
```

### Track with Lyrics

Input:
```markdoc
- [**Breathe**](/audio/breathe.mp3) (2:43)

  - (0:00) Breathe, breathe in the air
  - (0:08) Don't be afraid to care
  - (0:15) Leave, but don't leave me
  - (0:22) Look around, choose your own ground

  - (0:32) Long you live and high you fly
  - (0:39) And smiles you'll give and tears you'll cry
```

Output (within playlist):
```html
<li class="rune-playlist__track" data-src="/audio/breathe.mp3">
  <div class="rune-playlist__track-meta">
    <span class="rune-playlist__track-name">Breathe</span>
    <span class="rune-playlist__track-duration">2:43</span>
  </div>
  <div class="rune-playlist__lyrics">
    <div class="rune-playlist__verse">
      <p class="rune-playlist__lyric" data-time="0">Breathe, breathe in the air</p>
      <p class="rune-playlist__lyric" data-time="8">Don't be afraid to care</p>
      <p class="rune-playlist__lyric" data-time="15">Leave, but don't leave me</p>
      <p class="rune-playlist__lyric" data-time="22">Look around, choose your own ground</p>
    </div>
    <div class="rune-playlist__verse">
      <p class="rune-playlist__lyric" data-time="32">Long you live and high you fly</p>
      <p class="rune-playlist__lyric" data-time="39">And smiles you'll give and tears you'll cry</p>
    </div>
  </div>
</li>
```

Verse groups separated by blank lines in the source become separate `__verse` containers. The player highlights the current `__lyric` element and auto-scrolls.

---

## Sandbox Integration

### Static Data Binding

Playlists export structured data for sandbox use via the `source` attribute pattern from the Sandbox Futures spec:

```markdoc
{% playlist id="ambient" type="mix" player %}
# Ambient Mix

- [**Weightless**](/audio/weightless.mp3) — *Marconi Union* (8:09)
- [**Electra**](/audio/electra.mp3) — *Airstream* (7:12)
{% /playlist %}

{% sandbox source="ambient" framework="p5" %}

```js
// DATA provides the static playlist structure
// DATA.tracks[0].name === "Weightless"
// DATA.tracks[0].chapters, DATA.tracks[0].lyrics etc.
```

{% /sandbox %}
```

The playlist's DATA export shape:

```typescript
interface PlaylistData {
  name: string;
  type: 'album' | 'podcast' | 'audiobook' | 'series' | 'mix';
  artist?: string;
  tracks: {
    name: string;
    artist?: string;
    src?: string;
    duration?: number;     // seconds
    date?: string;
    chapters?: {
      name: string;
      time: number;        // seconds
      description?: string;
    }[];
    lyrics?: {
      time: number;
      text: string;
      verse: number;
    }[];
  }[];
}
```

### Live Audio Streaming

Static data gives the sandbox the playlist structure, but live visualisation needs real-time audio analysis: current playback position, frequency spectrum, waveform amplitude. The sandbox runs in an iframe and can't share an `AudioContext` with the parent page, so the audio player analyses its own audio and streams pre-computed frame data to the sandbox via `postMessage`.

**How it works:** The audio player (in the parent page) attaches an `AnalyserNode` to its audio source. On every `requestAnimationFrame`, it reads the frequency and waveform data, packages it with playback state, and posts it to the sandbox iframe. The sandbox receives ~60 frames per second of pre-analysed audio data — enough for smooth visualisation without any Web Audio API access in the iframe.

The frame data is small — 128 frequency bins, 256 waveform samples, and a few scalars — so the serialisation cost of `postMessage` is negligible at 60fps.

**Audio frame data:**

| Field | Type | Description |
|---|---|---|
| `currentTime` | number | Current playback position in seconds |
| `duration` | number | Total track duration in seconds |
| `progress` | number | Playback progress as 0–1 ratio |
| `playing` | boolean | Whether audio is currently playing |
| `track` | number | Current track index in the playlist |
| `trackName` | string | Current track name |
| `frequency` | number[] | Frequency spectrum bins (0–255 per bin, typically 128 bins) |
| `waveform` | number[] | Time-domain waveform samples (0–255, typically 256 samples) |
| `volume` | number | Current volume level (0–1) |
| `chapter` | number \| null | Current chapter index, if chapters exist |
| `lyric` | number \| null | Current lyric line index, if lyrics exist |

**Sandbox API:** When a sandbox's `source` points to a playlist or audio rune, the transform injects an `audio` object into the sandbox context:

```javascript
// Automatically available in sandbox when source is a playlist/audio rune
const audio = {
  // Subscribe to audio frames (~60fps when playing)
  onFrame(callback) { /* registers frame handler */ },
  
  // Current state (updated each frame, readable any time)
  currentTime: 0,
  duration: 0,
  progress: 0,
  playing: false,
  frequency: [],
  waveform: [],
  track: 0,
  trackName: '',
  volume: 1,
  chapter: null,
  lyric: null,
};
```

**Visualisation example:**

```markdoc
{% playlist id="mix" type="mix" player %}
# Evening Session

- [**Sunset**](/audio/sunset.mp3) — *Solar Fields* (7:30)
- [**Midnight**](/audio/midnight.mp3) — *Carbon Based Lifeforms* (9:12)
{% /playlist %}

{% sandbox source="mix" framework="p5" %}

```js
function setup() {
  createCanvas(600, 200);
  noStroke();
}

function draw() {
  background(15, 15, 25);

  if (!audio.playing) {
    fill(100);
    textAlign(CENTER, CENTER);
    text('Press play to visualise', width/2, height/2);
    return;
  }

  // Frequency spectrum as bars
  const barWidth = width / audio.frequency.length;
  audio.frequency.forEach((value, i) => {
    const h = (value / 255) * height;
    const hue = map(i, 0, audio.frequency.length, 200, 300);
    fill(hue, 80, 60 + value * 0.15);
    rect(i * barWidth, height - h, barWidth - 1, h);
  });

  // Progress indicator
  fill(255, 50);
  rect(0, height - 3, width * audio.progress, 3);
}
```

{% /sandbox %}
```

**Beat detection example:**

```markdoc
{% sandbox source="mix" framework="three" %}

```js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 100);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(600, 300);
document.body.appendChild(renderer.domElement);

// Create objects that respond to audio
const spheres = Array.from({ length: 8 }, (_, i) => {
  const geo = new THREE.SphereGeometry(0.3, 32, 32);
  const mat = new THREE.MeshPhongMaterial({ color: 0x4488ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.x = (i - 3.5) * 1.2;
  scene.add(mesh);
  return mesh;
});

const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 5, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

audio.onFrame((frame) => {
  // Scale spheres by frequency bands
  spheres.forEach((sphere, i) => {
    const bandStart = Math.floor((i / spheres.length) * frame.frequency.length);
    const bandEnd = Math.floor(((i + 1) / spheres.length) * frame.frequency.length);
    const band = frame.frequency.slice(bandStart, bandEnd);
    const energy = band.reduce((a, b) => a + b, 0) / band.length / 255;

    sphere.scale.setScalar(0.5 + energy * 2);
    sphere.material.emissive.setHSL(0.6 + energy * 0.2, 0.8, energy * 0.3);
  });

  renderer.render(scene, camera);
});
```

{% /sandbox %}
```

**Lyric sync example:**

```markdoc
{% sandbox source="mix" %}

```html
<div id="lyric-display"></div>
```

```css
#lyric-display {
  font-size: 2rem;
  text-align: center;
  padding: 2rem;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s;
}
```

```js
const display = document.getElementById('lyric-display');
const track = DATA.tracks[0];
let lastLyric = -1;

audio.onFrame((frame) => {
  if (frame.lyric !== null && frame.lyric !== lastLyric) {
    lastLyric = frame.lyric;
    const line = track.lyrics[frame.lyric];
    display.style.opacity = 0;
    setTimeout(() => {
      display.textContent = line.text;
      display.style.opacity = 1;
    }, 150);
  }
});
```

{% /sandbox %}
```

### Streaming Lifecycle

The audio player only streams frame data when both conditions are met: audio is playing, and at least one sandbox is subscribed. When audio is paused, the player sends one final frame with `playing: false` and stops streaming. When no sandboxes are listening, the `AnalyserNode` is disconnected to save resources.

When the user switches tracks, the player sends a `track-change` event before resuming frame streaming:

```javascript
// In sandbox context
audio.onTrackChange((event) => {
  // event.track — new track index
  // event.trackName — new track name
  // event.chapters — chapters for the new track
  // event.lyrics — lyrics for the new track
  // Reset visualisation state for the new track
});
```

This lets the sandbox reset its visual state (clear particles, reset colours, update displayed metadata) when the track changes rather than discovering the change from a frame where `track` suddenly has a new value.

---

## Migration from Existing Runes

| Existing | New | Changes |
|---|---|---|
| `music-recording` | `track` with `type="song"` | `byArtist` → `artist`, `copyrightYear` → `year` |
| `music-playlist` | `playlist` with `type="album"` | Remove `trackFields`. Pipe syntax → Markdown-native compact format |

Both existing rune names are retained as aliases during the transition period. The pipe-delimited compact syntax is accepted but deprecated — build warnings encourage migration to the Markdown-native format.
