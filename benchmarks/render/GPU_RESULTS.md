# Hardware encoding results

## Host and encoder

- GPU: NVIDIA GeForce RTX 5050 Laptop GPU
- FFmpeg encoder: `h264_nvenc` (a real one-frame encode probe succeeded)
- Output: H.264, 1280×720, 24 fps, quality 80
- Render path: native Skia Canvas2D drawing + GPU H.264 encoding

## Stage timings

| Fixture | Draw (ms) | Pixel readback (ms) | GPU frame submit (ms) | GPU finalize (ms) | Total (ms) | End-to-end FPS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Static | 5234 | 3820 | 256 | 272 | 10606 | 4.53 |
| Motion | 5171 | 3987 | 254 | 258 | 10736 | 4.47 |
| Charts | 4889 | 3766 | 228 | 227 | 10101 | 4.75 |
| Transitions | 14498 | 11258 | 345 | 234 | 27571 | 3.95 |

The original WASM baseline spent 1.7–15.7 seconds in `encoderSubmit`, depending on the fixture. With NVENC, frame submission took 0.2–0.35 seconds and finalization took about 0.2–0.27 seconds. Draw and readback are now the main costs. Total render times vary between runs; compare several runs before claiming a stable end-to-end speedup.

I extracted the same static fixture frame from the WASM and NVENC outputs. Their text and layout appeared the same on visual inspection. This is a visual spot check, not a measured quality benchmark.

The normal native path still draws with CPU-backed Skia Canvas2D. GPU acceleration applies to H.264 encoding. The optional Chromium path requests hardware Canvas2D/WebGL and logs the renderer; its runtime GPU path was not exercised because Playwright is not installed in this workspace.
