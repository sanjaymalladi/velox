# Velox motion graphics: depth and Theatre.js plan

## Product goal

Make a short prompt produce a designed motion piece, not a sequence of title cards. Keep the simple VML path for small models. Use images, depth, camera movement, and recurring visual subjects to add depth without making users calculate layout or keyframes.

## What is in the current local build

- `visualWorld` carries the palette, surface, lighting, and motif across scenes.
- `image.lookup("coding")` finds a no-key B-roll image and the CLI caches it with its available source and license details.
- `depth` and `parallaxDrift` move image planes at different rates.
- `.tilt(x, y)` / VML `tilt="x,y"` gives an image plane perspective using the same Canvas2D renderer in preview and MP4 export.
- `camera="orbit"` adds a seek-safe, gentle orbit move to tilted image planes; it does not add motion to text or charts.
- The renderer benchmark now includes a tilted, layered image case so the depth effect stays visible in performance reports.
- Scene story fields, motion intent, image provenance, and VML lint help explain what a visual does and where it came from.

This is a 2.5D shot system: it uses perspective on image planes and camera motion. It does not claim that text, charts, and all Velox elements are full 3D objects.

## Simple authoring levels

### Level 1: Ask for the shot

The LLM selects a shot style and image query. Velox chooses safe camera speed, depth range, crop, and lighting from the visual world.

```ts
scene(7).camera('parallaxDrift').add(
  image.lookup('night city from above').fill().depth(-0.4),
  image.lookup('person working at a laptop').size(700, 460).depth(0.8).tilt(7, -10),
  text('A city never sleeps').center().size(64),
)
```

### Level 2: Nudge it

Authors can change the image, angle, depth, and camera preset. They do not need to calculate coordinates or timing curves.

### Level 3: Direct it visually

Add Theatre.js to the Studio as an optional camera and plane authoring view. Theatre.js can export editable project state as JSON; Velox should store that state as a sidecar and compile only the supported camera and plane tracks into Velox's deterministic frame timeline. Do not ask an LLM to generate raw Theatre.js project JSON.

## Build order

1. **Image-led depth shots:** finish the image lookup, perspective image planes, depth ranges, and image provenance. Keep existing 2D scenes valid. Compare preview and exported frames.
2. **Small shot vocabulary:** add a few named camera moves such as `push`, `orbit`, `follow`, and `rackFocus`. Each move has library-owned timing defaults. Keep `.camera('...')` as the short path and expose numeric controls only when needed.
3. **Theatre.js Studio adapter:** let a person adjust camera and image-plane tracks on a timeline, then export a compact Velox sidecar. Keep Theater authoring optional and keep render evaluation seek-safe.
4. **Selective true 3D:** only after image-led shots work, add a small number of reusable 3D subjects (for example, a turning device, a map globe, or an object reveal). Keep typography and charts in the existing renderer and composite them as one shot.

## Theatre.js boundary

Theatre.js is a timeline editor and animation state engine. It does not render a complete Velox video or provide B-roll. Use it to author keyframes in Studio; use Velox to resolve assets, apply design rules, lint the story, evaluate exact timestamps, and render the final video. This keeps the default model prompt small and avoids making Theatre's editor state the public markup format.

## Quality gates

- A 10-line example uses sourced images, layered depth, and camera motion without repeating card layouts.
- Image sources and license details remain attached after VML serialization.
- Scrubbing to the same timestamp produces the same frame in browser preview and CLI export.
- A reduced-motion render remains clear and keeps all important text and facts.
- Theatre.js is an optional authoring tool; generated VML stays short and readable.
- A representative video has a frame review and a measured render profile before a release.
