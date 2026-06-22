---
"@refrakt-md/runes": patch
"@refrakt-md/behaviors": patch
"@refrakt-md/lumina": patch
---

Add `bleed="crop"` to the `sandbox` rune. A fixed-width or naturally wide component overflows the frame on a phone and is clipped at the rounded inset edge, which reads like a bug. `bleed="crop"` instead runs the sandbox's inline-end edge out to the screen on a narrow viewport and squares those corners, so the component reads as cropped by the screen — a real component at its natural size, continuing off-frame.

It's content-aware and opt-in: the behaviour measures the rendered content width over the existing resize bridge and toggles `data-overflowing` only when the component is genuinely wider than the frame (with hysteresis so widening the frame to bleed can't oscillate). A component that fits stays inset with rounded corners.
