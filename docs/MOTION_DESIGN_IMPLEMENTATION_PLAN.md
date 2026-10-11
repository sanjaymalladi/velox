# Velox Motion Design Implementation Plan

This plan turns the principles in MOTION_DESIGN_PRINCIPLES.md into library capabilities. It keeps existing VML projects working and addresses the demonstrated failures: slow final rendering and presentation-like output.

## Product outcome

An LLM or small team can describe a subject and produce a source-backed, coherent motion piece with meaningful visuals, timed narration and captions, trustworthy charts, and a reviewable draft. Velox guides composition and motion; it does not force every video into a fixed card template.

## Current starting point

- VML already supports video-level and scene-level backgrounds, themes, typography, element entrance/exit/loop motion, transitions, charts, assets, and scene layouts.
- SceneConfig and VeloxVideoConfig live in packages/velox-core/src/types.ts; VML parsing and compilation are in markupCompiler.ts; lint rules are in lint.ts.
- The native renderer draws every requested frame and reads back the full RGBA canvas. It now detects available hardware H.264 encoders and keeps the WASM encoder as a portable fallback.
- Audio planning and muxing exist, but the Indian history deliverable had no voice track and caption timing was spread evenly across each scene.
- The motion reference existed without enforcement. The implementation progress section below records the first VML, API, renderer, and lint capabilities now in place.

## Implementation progress

The first implementation pass adds the following capabilities. This does not complete every phase below.

- **Phase 1, partial:** native rendering detects and uses an available FFmpeg hardware H.264 encoder, keeps the WASM fallback, and writes a stage profile. A full 60 second 1280×720 export measured about 6.5 fps; drawing and pixel readback took almost all render time. See `benchmarks/render/GPU_RESULTS.md` and the profile beside the Indian history MP4.
- **Phase 2, implemented core:** VML and the TypeScript API support a persistent visual world with background, material, lighting, texture, motif, depth, and palette. Scenes can inherit that world and declare chapter, focus, accent, and a reason for a background change.
- **Image-led depth, first slice:** images can be perspective-tilted with one `.tilt(x, y)` call or `tilt="x,y"` VML attribute. A small Canvas2D mesh keeps the effect consistent in preview and native export. The explainer JSON API accepts a camera preset; `parallaxDrift` applies library-owned depth defaults to background and overlay images.
- **Phase 3, partial:** elements can declare motion intent. Lint warns about missing intent in heavily animated markup and detects repeated compositions and transitions. Reusable story components and carry-forward motif enforcement remain open.
- **Phase 4, partial:** image and chart types carry provenance; lint warns about missing chart sources, dates, units, and conceptual labels. Source-backed map and timeline primitives remain open.
- **Phase 5, partial:** lint catches speech audio without captions and duplicated caption/headline text. Voice generation and word-aligned captions from audio timing remain open. `reducedMotion` disables animation and camera movement at render time.
- **Phase 6, partial:** lint checks text load, scene focus, source coverage, contrast on declared solid backgrounds, repeated layouts, background changes, captions, chart metadata, and safe areas. Styleframe/animatic export, simultaneous-motion checks, and broader contrast analysis remain open.

The Indian history example demonstrates these features and has a render review in `videos/indian-history/REVIEW.md`.

## Guiding decisions

1. Extend VML; keep old files valid. New visual-world settings and provenance fields have compatible defaults.
2. Use a coherent world, not a fixed slide background. Keep palette, material, lighting, and recurring motif consistent; allow semantic changes in camera, focus, visible region, and accent.
3. Motion has intent. Prefer typed actions such as reveal, trace, compare, transform, settle, and exit over arbitrary effect stacking.
4. Story before templates. Provide visual patterns as choices and composition guidance, not as a mandatory repeated layout.
5. Measure render performance. Do not ship a speed change without stage-level timing and output comparison.
6. Do not imply evidence that is not present. Quantitative charts require sourced data; conceptual diagrams must be labeled; generated historical imagery must be marked as illustration.

## Phases

### Phase 0 — Baseline and design contract

**Purpose:** Make progress measurable and catch visual-direction problems before another expensive render.

**Deliverables**

- Add a repeatable renderer benchmark fixture: short motion-heavy, static-heavy, chart-heavy, and transition-heavy examples at fixed resolution and FPS.
- Record wall time and separate draw, canvas readback, encode, and audio-mux time. Report frames per second, output size, frame count, file size, and peak memory where available.
- Save reference stills at the opening, busiest frame, and ending for each design fixture.
- Add a quality rubric: continuity, scene-specific imagery, focal clarity, text load, motion purpose, chart accuracy, caption timing, and sound.

**Acceptance**

- A benchmark report identifies the largest render-time costs for the current baseline.
- A reviewer can judge styleframes and storyboard before a full export.

### Phase 1 — Reduce final render time

**Purpose:** Improve output speed without reducing final resolution, FPS, or visual quality by default.

**Likely implementation areas**

- Instrument nativeRender.ts and drawFrame.ts before optimization.
- Benchmark Skia context options, including whether willReadFrequently helps or hurts the actual canvas-to-encoder path.
- Benchmark the WASM H.264 encoder against streaming raw frames to available FFmpeg. Keep a portable fallback; make hardware encoding optional and detectable.
- Cache rasterized, time-invariant scene layers such as backgrounds, static type, and diagrams. Composite only moving layers. Cache keys include dimensions, theme, asset versions, and relevant styles.
- Reuse transition and blur buffers. Avoid recomputing backgrounds, text layouts, and static vector paths every frame.
- Consider worker rendering only after proving deterministic frame evaluation and isolated canvas state. Preserve frame order.
- Keep draft resolution/FPS controls, but show selected settings and estimated render time before starting.

**Implemented so far**

- Stage timing and memory snapshots are available with `velox render --profile`.
- Fixed benchmark scenes cover static, motion, chart, and transition workloads.
- Native MP4 export probes NVIDIA NVENC, AMD AMF, and Intel QSV; it streams frames to a working hardware encoder and falls back to WASM if the hardware path fails.
- Chromium headless export requests hardware acceleration and reports when WebGL falls back to a software renderer.
- Native export reuses the scene timeline and uses the faster measured canvas readback hint.
- The default native Canvas2D drawing and full-frame pixel readback still use CPU-backed Skia. GPU encoding reduces H.264 submission cost, but it does not accelerate all drawing work.

**Acceptance**

- Benchmarks report each pipeline stage and compare visual output against reference frames.
- The common 720p/24fps example is faster than the 6:34 baseline on the same machine, with no visible regression.
- Draft mode stays correctly scaled and substantially faster than final mode.
- Set a documented performance target only after measurements across supported machine classes; use a dedicated runner for CI performance gates.

### Phase 2 — Persistent visual world and design tokens

**Purpose:** Give a whole video a consistent visual identity without forcing identical scene layouts.

**Proposed model**

- Add an optional root-level world or visualSystem configuration represented in types and parsed from VML. It can define palette roles, background material, lighting, texture/noise, depth, type roles, safe areas, and recurring motifs.
- Let scenes inherit the world and set semantic changes such as chapter, accent, focus, camera, or background-shift reason.
- Add a few subject-appropriate world presets: editorial paper/map, archival, studio/product, scientific/data, and cinematic. Presets supply tokens and rules, not complete cards.
- Keep explicit scene-level background overrides for backward compatibility.

**Acceptance**

- A sample uses one world across at least four scenes while changing focus, camera, composition, and content.
- A background change is intentional and has a stated chapter or mood reason.
- Existing VML fixtures render unchanged unless authors opt into the new configuration.

### Phase 3 — Story grammar and motion vocabulary

**Purpose:** Make visual actions express the story instead of repeating title cards.

**Proposed primitives**

- Semantic motion intents: reveal, trace, compare, transform, emphasize, settle, and exit.
- Story components: timeline, route/map, object or artifact reveal, before/after comparison, process flow, data reveal, and kinetic-type beat.
- Each component declares its focal element, supporting elements, entry/hold/exit timing, and optional audio/caption cue.
- Relationship-aware transitions: shared-object/container transform, shared direction/axis, cause-to-result reveal, or a simple cut/fade when shots are unrelated.
- Reusable motifs and style rules. Allow scene composition to vary; do not enforce a fixed centered headline/subtitle/caption stack.

**Acceptance**

- Remake the Indian-history sample with several visual actions and no more than two repeated scene compositions.
- At least one visual object or motif continues across adjacent scenes.
- Each scene has one focal point and meaningful action; motion can be disabled without removing essential information.

### Phase 4 — Images, charts, and source provenance

**Purpose:** Make visuals specific to the subject and protect factual trust.

**Proposed capabilities**

- Extend asset metadata with source, creator, rights/license, date/context, and a marker for generated or reconstructed illustration.
- Add an asset-review report before rendering so broken, missing, or unlicensed assets are visible.
- Extend chart configuration with dataset/source/date/units and distinguish quantitative charts from conceptual diagrams.
- Add chart presets that keep labels, axes, units, category order, and color meanings stable during animation.
- Animate one change at a time; preserve reference traces when prior states are needed for comparison.
- Add map/path and timeline primitives that use supplied or source-backed data; never fabricate geography or quantitative values.

**Acceptance**

- A quantitative chart without a source produces a lint error or explicit warning.
- A conceptual diagram cannot be mistaken for measured data.
- Asset provenance is retained in a sidecar/report and survives VML serialization.

### Phase 5 — Narration, captions, and audio timing

**Purpose:** Make visuals, speech, music, and captions one timeline.

**Proposed capabilities**

- Define narration in the existing audio plan with source, offset, trims, volume, and optional word timings.
- Support a local or configured TTS provider through a provider interface; do not require a secret for the offline path.
- Derive phrase/word caption cues from the actual audio or provider timing. Do not spread words evenly across a scene as a substitute.
- Separate design text from subtitles. Lint duplicated caption/headline copy and missing voice tracks when captions represent speech.
- Add mixing controls for narration, music, and SFX; validate silence, clipping, and duration alignment.

**Acceptance**

- A rendered sample contains an audio stream, verified with ffprobe.
- Captions track spoken words, stay inside safe areas, and do not overlap the focal visual.
- A silent video does not display narration-style subtitles.

### Phase 6 — Styleframes, animatic, and design lint

**Purpose:** Catch visual direction and timing problems before the long final render.

**Proposed capabilities**

- A CLI command creates an animatic from the storyboard/script and low-cost representative frames.
- A styleframe/contact-sheet command captures the opening, mid-piece, and ending before full render.
- A visual lint report checks repeated layouts, redundant text, text density, safe areas, contrast, missing focal visuals, excessive simultaneous motion, arbitrary transition repetition, unsupported numeric charts, caption/audio mismatch, and inconsistent tokens.
- Keep machine checks separate from subjective review. Provide a human checklist for story clarity and visual quality.
- Render review proxies with the same logical layout as final output.

**Acceptance**

- The history video's known issues are surfaced before final render: repeated card layout, duplicate text/captions, unrelated repeated motifs, no narration, and static scenes.
- Users can review an animatic and styleframes much faster than a final render.
- Lint messages identify the scene and give a concrete correction.

### Phase 7 — Reference pack and release bar

**Purpose:** Make the principles practical for small models.

**Deliverables**

- Package the motion guide, VML examples, styleframes, and promptable design schemas with the CLI/repo.
- Add complete examples for editorial explainer, product story, data story, and historical story.
- Include each example's sources, asset provenance, narration script, and review notes.
- Keep examples varied enough to demonstrate a motion system rather than a template catalog.

**Release bar**

- Examples pass lint and are reviewed as rendered video, not only as source markup.
- Performance reports include machine, quality, resolution/FPS, and render-stage timing.
- The video, VML, transcript/captions, styleframes, and asset provenance are reviewable together.

## Recommended order

1. Phase 0 baseline and quality rubric.
2. Phase 1 render profiling and low-risk speed wins.
3. Phase 2 visual world and token inheritance.
4. Phase 3 story grammar and meaningful transitions.
5. Phase 6 styleframe/animatic and lint, alongside phases 2–3 so design changes are reviewable.
6. Phase 4 sourced visuals and charts.
7. Phase 5 narration and synchronized captions.
8. Phase 7 examples and release bar.

## First milestone

Build one narrow vertical slice:

- Instrument the current renderer and establish the baseline.
- Add a persistent visual-world schema and inheritance.
- Add three story components: timeline, route/map, and artifact/object reveal.
- Add lint for repeated card layouts, duplicate subtitle copy, and unsupported quantitative charts.
- Rebuild one 60-second explainer, inspect styleframes/animatic, then render and compare performance.

Do not begin by adding dozens of effects or presets. First prove that one coherent world, a few story-driven components, and a measured render loop solve the observed problems.
