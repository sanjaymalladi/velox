# Motion Design Principles for Velox

Research synthesis for motion graphics, short explainers, title sequences, animated visuals, and charts. Use this to guide Velox defaults and future design lint.

**Status:** working reference. Velox now supports and lints a first subset: persistent visual worlds, scene focus and story metadata, motion intent, source records, chart provenance, text contrast, caption duplication, repeated compositions, and reduced-motion rendering. The rules below remain design guidance where automated checks cannot judge quality.

## Current enforcement in Velox

VML and the TypeScript API can define a shared visual world, describe each scene's focus and source, and assign intent to element motion. Lint checks visual-world continuity, missing scene focus/source dates, repeated compositions and transitions, unexplained background changes, text density, weak text contrast against a declared solid background, missing speech captions, duplicate caption copy, chart data provenance/units, and untracked illustrative assets. `reducedMotion` disables motion in the renderer.

These checks are warnings where context matters. A passing lint report does not certify historical accuracy, artistic quality, complete accessibility, or that an image's rights are valid. Contrast lint currently compares explicit hex text colors with a declared hex visual-world background; gradients, image backgrounds, transparency, and inherited theme colors need visual review.

## Research approach

The sources cover three areas:

1. Brand and motion-graphics direction: GitHub's Brand Toolkit, VIDVOX education, and styleframe practice.
2. Interface motion systems: Material Design, IBM Carbon, and Atlassian. These explain focus, continuity, timing, and transitions. Their exact interface timings do not directly define video timing; use the principles, then adapt to narration and screen size.
3. Perception and accessibility: peer-reviewed research on animated visualizations and W3C guidance.

Rules called **synthesis** are practical conclusions drawn across sources. They are not universal laws or direct quotes.

## Core rule

Each movement, effect, visual, and text element must do at least one job:

- **Explain** a relationship, change, place, or process.
- **Guide** attention to the important information now.
- **Connect** one beat to the next.
- **Express** a deliberate emotional or brand moment.

Remove elements that do none of these jobs. This follows GitHub's goals for motion: facilitate, engage, and impact. IBM Carbon similarly separates restrained productive motion from occasional expressive motion.

## 1. Build one visual world for the whole video

### Keep the visual world consistent, not frozen

**Synthesis:** Maintain one visual world across a piece: related palette, material, lighting, typography, graphic language, and recurring motif. Do not force one exact background image to remain motionless in every scene. That creates a static deck. Do not switch to an unrelated background at every cut. That creates unrelated slides.

Use this default:

- Pick one subject-appropriate environment: paper, map, studio, archival surface, landscape, or another coherent world.
- Keep its material, grain, light direction, and palette related.
- Change camera position, crop, scale, focus, or visible region as the story advances.
- Carry one meaningful visual anchor between beats: an object, route line, location marker, shape, frame, or sound.
- Change the environment only when the story signals a real change of time, place, mood, or subject. Carry one element through the change when possible.

For a history explainer, maintain a map-and-paper world. Move from a river basin to a city grid; follow a route to another region. Accents can change by era while the map style, labels, texture, and lighting remain related.

### Background rules

- Give the foreground a clear contrast advantage. Backgrounds support the subject; they must not compete with it.
- Keep background motion slow and low contrast behind readable text.
- Reserve negative space for text and captions. Do not put important detail under words.
- Use gradients to set tone, not as a substitute for subject-specific visual content.
- Prefer a pan, zoom, reveal, or object-led transition that explains the relationship between frames.
- Add foreground, middle, and background layers only when depth helps explain the scene.

## 2. Plan before animating

Establish these items before detailed motion:

1. Audience and purpose: what should viewers learn or feel?
2. Source-backed script: what is said, and which claims need evidence?
3. Beat sheet: one purpose per beat; remove repeated claims.
4. Storyboard: what the viewer sees, not only the words.
5. Styleframes: render a few representative stills before animating. A short piece often needs an opening, a complex middle frame, and an ending. Each styleframe fixes palette, type, lighting, composition, and recurring devices.
6. Animatic: place rough visuals against scratch narration or music at the real duration. Confirm the story and pacing before detailed animation.
7. Motion pass: animate after the visual world and sequence work as stills.

A storyboard answers **what happens and in what order**. A styleframe answers **what the finished work looks like**. They solve different problems. Reject a storyboard that repeats “title + subtitle + icon” for every beat.

## 3. Compose for one focal point

- Give each beat one main focal element: an object, person, map region, number, word, or chart feature.
- Make supporting text and graphics visibly secondary.
- Avoid moving several unrelated elements at the same time. Group related items and move them as one unit.
- Use scale, position, contrast, direction, and timing to establish hierarchy. Do not make every element large, bright, and moving.
- Design the still frame first. If it is confusing when paused, motion will make it harder to read.
- Check safe margins and legibility separately for landscape, portrait, and square output.

Material's choreography guidance recommends fewer independently moving parts and shared group transformations. This is an interface principle that transfers well to video staging.

## 4. Use text as a visual element, not the entire video

### Hierarchy

Use a small, stable type system:

- **Headline:** one short, meaningful statement.
- **Support:** one date, place, number, or short explanation if needed.
- **Caption/subtitle:** spoken words, in a separate consistent position.

Do not show a paragraph as a graphic while also reading the same paragraph in voiceover. Keep detail in narration; show only the essential phrase, name, date, or number.

### Kinetic type

- Make movement reinforce meaning: a route name travels along a route; a date lands on a timeline; a word grows when the idea is growth.
- Reveal phrases or semantic chunks. Reveal one word at a time only when timings are accurate or the effect itself serves the story.
- Keep body text still long enough to read. Do not combine dense text with fast motion and a moving background.
- Use one main type family with a clear range of weights. Reserve display treatment for moments that need it.
- Check contrast and line length at the smallest intended viewing size.
- Avoid bouncing, rolling, slapping, or generic preset entrances unless the story calls for them. GitHub explicitly warns against out-of-the-box presentation effects.

### Captions

- Captions are for speech. Do not use subtitle pills to repeat headlines as decoration.
- Align captions to recorded or generated speech. Evenly spreading words across a whole scene is a placeholder, not accurate captioning.
- Keep captions in a stable lower safe area, with readable line breaks.
- Do not cover the focal subject, chart labels, or map details.
- If there is no narration, do not render fake subtitles. Use purposeful on-screen copy instead.

## 5. Make motion carry meaning

Choose a motion role before an effect:

- **Reveal:** show a new object, place, or fact.
- **Transform:** show one state changing into another.
- **Trace:** follow a route or process.
- **Compare:** align states so differences are visible.
- **Emphasize:** give one important beat extra weight.
- **Transition:** preserve or clarify a relationship between scenes.
- **Atmosphere:** support mood with subtle movement.

Keep routine movement restrained. Reserve expressive movement for the hook, a major reveal, or the ending. Not every moment needs all motion goals.

### Timing and easing

- Give movement a purpose. Avoid arbitrary perpetual motion.
- Use easing when an object enters, settles, or leaves. Easing communicates acceleration, deceleration, weight, and intent.
- Match duration to travel distance, visual weight, and reading load. Faster is not always clearer; slower is not always more cinematic.
- Sequence the beat: establish context, direct attention, reveal information, allow a pause to understand.
- Keep related motion aligned in direction and timing. Offset secondary details enough to support hierarchy without making them feel detached.
- Hold important visuals long enough to inspect. Use pauses; not every second needs movement.

### Effects

- Treat blur, glow, grain, particles, parallax, and shake as tools with specific jobs, not default polish.
- Blur can show focus, depth, or a transition. Never blur text or data the viewer must read.
- Use glow to identify a focal object or active path, not every element.
- Use texture only when it supports the material and remains quiet behind text.
- Use parallax only when it clarifies depth. Large or fast parallax can distract or cause discomfort.
- Choose one lead effect per beat. Keep supporting effects subtle.
- Offer a reduced-motion option for large camera moves, parallax, and non-essential effects.

## 6. Choose transitions from the relationship between shots

Ask what connects the outgoing and incoming shots:

- Same object continues: transform or track it into the next state.
- Related places or steps: follow a shared direction, axis, route, or scale.
- Cause and result: let the cause create or reveal the result.
- Unrelated beats: use a clean cut or short fade. Do not invent a wipe relationship.
- Strong chapter change: use a pause or clear transition, while retaining a motif or sound that ties the video together.

Use one transition language across a piece. A repeated transition can support a visual identity; a wipe between every static card becomes a slide-deck cue. Material's transition system aims to preserve relationships between views; applying that idea to video is a design adaptation.

## 7. Use meaningful visuals, not just labels

- Prefer an image, diagram, map, artifact, environment, or meaningful shape when it shows the claim better than text.
- For historical content, use sourced material. Track source, date, rights, and context with each asset.
- Label generated or reconstructed imagery as illustration. Do not present invented architecture, maps, or artifacts as documentary evidence.
- Abstract graphics should explain a subject-specific process. Generic decoration does not explain history.
- Keep recurring objects consistent. If a dot means a city in one scene, do not use it as a person or statistic in the next.
- Build actions into the visuals: draw a route, uncover a layer, connect nodes, or transform a symbol. Avoid icons that merely appear under a headline.

## 8. Animate charts and diagrams responsibly

Animated data graphics ask viewers to track moving marks, remember prior states, and judge change. A 2026 review of animated visualizations categorizes these tasks and discusses their perceptual capacity limits.

- Begin with the question the graphic answers. One chart should make one main comparison or change clear.
- Use cited data for quantitative charts. Attach the source and date. Never invent values just to make a chart move.
- If the graphic is conceptual, label it as a diagram or illustration; avoid numeric axes and values.
- Keep axes, labels, category order, and color meanings stable unless their change is the point.
- Animate one meaningful change at a time. Avoid changing position, color, shape, and scale together when viewers must compare values.
- Preserve a trace or reference state if the prior position matters. The visualization paper discusses traces where information would otherwise disappear and visual memory is limited.
- Do not encode important quantitative differences only through speed or flicker.
- Leave labels visible after marks settle. Give viewers time to inspect the result.
- Never use a chart as decoration behind unrelated text.

## 9. Keep narration, captions, and visuals on one timeline

- Record or generate narration before fine timing. Fit the script to the target duration at a natural speaking pace.
- Make each visual beat support the current spoken point.
- Use word-level timing for karaoke captions and phrase-level timing for normal subtitles.
- Use music to support rhythm and mood without masking speech. Keep levels and ducking predictable.
- Sync reveals to music only when it improves clarity. Beat sync is optional; clarity is not.
- Check clipping, silence, and duration mismatch.

## 10. Accessibility and comfort

- Keep key information in text or narration, not only in color or motion.
- Maintain strong contrast and readable type at the target size.
- Avoid rapid flashes and aggressive repeated oscillation.
- Provide reduced-motion output or controls for non-essential motion.
- Keep captions inside safe areas and away from important visual evidence.
- Check whether the piece remains understandable with audio muted.

W3C's animation criterion directly covers interaction-triggered animation in web content. Applying its comfort guidance to rendered video is an accessibility extension, not a direct statement of the criterion's scope.

## 11. Avoid the presentation look

A video is likely to feel like a slide deck when several of these happen together:

- Every scene repeats a centered title, subtitle, and caption card.
- Every scene starts and ends as a self-contained card.
- The background changes but the visual subject does not.
- Motion consists only of text entrance and a wipe.
- Captions duplicate the headline.
- The subject is named but never shown or diagrammed.
- Scenes hold unchanged for most of their duration.

Correct this by carrying a subject through the piece, designing a few continuous shots, replacing repeated labels with visual actions, evolving one graphic across beats, and making scene changes preserve or intentionally break a visual relationship.

## 12. What this means for Velox

Velox needs authored visual systems, not only reusable card templates. A motion pack should define:

- **World:** background material, palette, lighting, texture, depth, and chapter-change rules.
- **Type:** display/body/caption roles, sizes by aspect ratio, safe areas, and text-density limits.
- **Composition:** focal-point rules, grid, negative space, layers, and subject placement.
- **Motion grammar:** reveal, track, transform, compare, trace, settle, and exit, with timing/easing defaults.
- **Transitions:** relationship-aware patterns and guidance on when to cut.
- **Visual vocabulary:** subject-specific objects, maps, diagrams, texture, and chart styling.
- **Audio:** narration, captions, music, and cue timing on one timeline.
- **Accessibility:** contrast, reduced-motion, caption, and flicker checks.
- **Provenance:** asset rights, fact citations, and numeric-data sources.

A composition should declare a persistent visual world and motif, then specify meaningful scene-level changes. A linter could flag repeated card structure, duplicated captions, unsupported numeric charts, excessive simultaneous motion, missing focal visuals, inconsistent color meanings, and text beyond safe margins.

### Starter review checklist

- [ ] One sentence says what viewers should learn or feel.
- [ ] Every beat adds an idea or visual development.
- [ ] Background and recurring visual device belong to one coherent world.
- [ ] Each scene has one focal point.
- [ ] Motion explains, guides, connects, or expresses something.
- [ ] Transitions match the relationship between shots.
- [ ] Text is short, legible, and does not duplicate narration.
- [ ] Captions follow actual speech timing.
- [ ] Charts use cited data or are clearly conceptual.
- [ ] Important visuals remain long enough to understand.
- [ ] Design works at the output size and safe area.
- [ ] Reduced-motion and muted-audio reviews are possible.
- [ ] Review styleframes and an animatic before final rendering.

## Sources

1. GitHub Brand Toolkit, **Motion principles** — purpose, type motion, avoiding generic presentation effects, transitions, accurate marketing visuals. <https://brand.github.com/motion/principles>
2. IBM Carbon Design System, **Motion** — productive and expressive motion, easing, duration, focus, and accessibility. UI timings are not reused as video timings. <https://carbondesignsystem.com/guidelines/motion/overview/>
3. Atlassian Design System, **Motion** — focus, purposeful motion, easing, limiting competing animations, reduced-motion guidance. <https://atlassian.design/foundations/motion/>
4. Material Design 2, **Understanding motion**, **The motion system**, **Choreography**, and **Speed** — spatial continuity, sequencing, shared transformations, transition relationships. Material 2 is no longer maintained; use this as a historical design reference, not current implementation guidance. <https://m2.material.io/design/motion/understanding-motion.html> · <https://m2.material.io/design/motion/the-motion-system.html> · <https://m2.material.io/design/motion/choreography.html> · <https://m2.material.io/design/motion/speed.html>
5. Jiang et al. (2026), **Design guidelines for animated data visualization based on perceptual capacity limits**, Cognitive Research — tracking, holistic judgments, additions/removals, capacity limits, and chart-design techniques. <https://link.springer.com/article/10.1186/s41235-026-00724-y>
6. W3C WAI, **Understanding WCAG 2.3.3: Animation from Interactions** — accessibility and vestibular comfort guidance. Its criterion applies to interaction-triggered animation in web pages; this guide marks the video use as an extension. <https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html>
7. VIDVOX Education, **Introduction to Motion Design** — composition, timing, continuity, anticipation, color, and choreography. <https://docs.vidvox.net/vv-edu/handout_module_3>
8. Art of Styleframe, **Styleframe Examples** — distinction between storyboard, moodboard, and styleframe; establishing look before animation. This is a practitioner reference. <https://artofstyleframe.com/styleframes/>

## Limits

This is a practical synthesis, not a systematic literature review. Some sources concern interface animation; their principles are adapted for time-based video. The strongest direct sources for brand/video motion here are GitHub's motion guide and VIDVOX education. The strongest source for animated data graphics is the peer-reviewed 2026 study. The background-continuity rules are a synthesis of visual consistency, choreography, and styleframe practice; no cited source says every video must use one identical background.
