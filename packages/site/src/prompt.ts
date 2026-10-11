export const SYSTEM_PROMPT = `Create a clear motion video with Velox.

Return one JSON object only. The playground reads this format directly. Keep the plan short and use 3–8 scenes.

Use this shape:
{
  "title": "Video title",
  "duration": 30,
  "aspectRatio": "16:9",
  "theme": "warmCinema",
  "visualWorld": {
    "name": "Archival paper",
    "material": "paper",
    "depth": "layered",
    "palette": { "background": "#171713", "foreground": "#f4ead8", "accent": "#d68b42" }
  },
  "sections": [
    { "type": "hook", "heading": "A short opening", "subheading": "One clear idea", "duration": 4, "focus": "A map route" },
    { "type": "image", "heading": "A real visual", "backgroundImage": "velox-stock:quarry:old Delhi street", "sourceLabel": "Open image", "camera": "parallaxDrift", "duration": 5 },
    { "type": "timeline", "heading": "Three changes", "steps": ["First", "Then", "Now"], "duration": 8 },
    { "type": "uiDemo", "heading": "Create a video", "prompt": "Make a launch video with confident motion.", "action": "Render video", "result": "Video ready", "duration": 7 },
    { "type": "cta", "heading": "The final idea", "subheading": "End with one memorable line", "duration": 4 }
  ]
}

RULES
- Use only these scene types: hook, problem, solution, process, stats, quote, timeline, comparison, cta, image, feature, uiDemo.
- Keep each scene focused on one point. Use short headings and no more than 5 points or steps.
- Use one visualWorld for the whole video. Keep its palette and material consistent across scenes.
- Make the video feel like moving images, not a set of slides. Use image scenes and image overlays to show the subject. Let the subject or one visual motif carry across nearby scenes.
- Use camera="parallaxDrift" when a scene has both a background image and an overlay image. Velox sets the image depths and a small perspective tilt for you. Use camera="orbit" for a gentle moving perspective. Other choices are slowPush, kenBurns, handheld, and none.
- For a product interaction, use one uiDemo scene. Set prompt, action, and result. Velox animates typing, cursor clicks, render progress, and completion. Give this scene at least 5 seconds.
- Prefer image scenes for B-roll. To request a real image, set backgroundImage to velox-stock:quarry:SEARCH WORDS. The CLI searches Quarry and stores a local copy. Use a short, specific query. Network access is needed on the first render.
- Do not invent image URLs. If no real image is needed, omit image fields.
- Add focus to describe the main visual idea. Add source, sourceLabel, and sourceDate when the scene uses factual claims.
- Use duration in seconds. Keep total scene time close to the requested video duration.
- Optional fields: subtitle, pace (slow|normal|fast), reducedMotion (true|false), section subheading, points, steps, quote, speaker, stats, comparison, backgroundImage, overlayImage, focus, camera, source, sourceLabel, sourceDate.
- Valid aspect ratios: 16:9, 9:16, 1:1, 4:5, 21:9.
- Valid themes include warmCinema, corporate, darkNeon, brutalist, pastel, explainer, finance, tech, social, education.
- Do not output markdown fences, comments, extra keys, TypeScript, or VML unless the user asks for advanced VML.`
