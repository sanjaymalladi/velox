# Native render baseline

This is the first recorded baseline for the fixed 720p/24fps render fixtures. It is a starting point, not a CI performance threshold.

## Run details

- Platform: Windows x64, OS build 10.0.26300
- CPU count reported by Node: 16
- Quality: 80
- Render path: native canvas + WASM H.264
- Date: 2026-10-08
- Each case was rendered once. Repeat runs before making fine-grained performance claims.

## Initial stage timings

| Fixture | End-to-end FPS | Draw (ms) | Pixel readback (ms) | Encoder submit (ms) | Encoder finalize (ms) | Audio mux (ms) | Output bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Static | 5.43 | 3866 | 2979 | 1743 | 3 | 74 | 100154 |
| Motion | 4.19 | 5063 | 4080 | 2079 | 3 | 53 | 67715 |
| Charts | 4.70 | 4164 | 3276 | 2502 | 14 | 94 | 213886 |
| Transitions | 2.72 | 13755 | 10153 | 15681 | 4 | 55 | 919754 |

The timings show that drawing, pixel readback, and encoder submission dominate. Encoder finalization, file writing, and audio mux are small for these fixtures. The transition fixture costs more because both scenes are drawn during each overlap.

## Canvas readback hint comparison

The static fixture was rendered once with `willReadFrequently: true` and once with it disabled. The first run took 8847 ms (5.43 end-to-end FPS); the second took 7896 ms (6.08 FPS). Draw, readback, and encoder submission all decreased in the second run. This is a promising result, but the single pair is not enough to claim a stable 11% speedup. The native renderer now disables this browser-oriented hint. Repeat on the target machines before setting a performance target.

Benchmark artifacts are written to a temporary directory by `pnpm benchmark:render`. The script prints the path to the MP4 files and machine-specific JSON report.
