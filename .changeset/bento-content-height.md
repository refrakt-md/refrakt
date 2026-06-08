---
"@refrakt-md/marketing": minor
"@refrakt-md/lumina": minor
---

Add a pair of opt-in text-zone knobs to `bento`, settable as a grid-level default
or a per-cell override (cell wins; the grid default is the only lever for
heading-sugar grids):

- **`content-height`** (`sm` | `md` | `lg` → 3 / 5 / 7rem) — pins the text area on
  **column cells** (top/bottom media) so they line up vertically; the media zone
  absorbs the remaining row-track height.
- **`media-ratio`** (`1/3` | `2/5` | `1/2` | `3/5` | `2/3`) — pins the media zone's
  share of the width on **beside cells** (start/end media); the content absorbs
  the rest.

The two act on perpendicular axes (a cell is either a column cell or a beside
cell), so they never collide. Both default to the existing behavior (natural text
height / 42% media split) and revert to natural height on the mobile stack.
