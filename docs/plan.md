# Docs website plan

Branch: `docs/lighter-docs-site` (worktree `D:/crazy-projects/remottion2.0-docs`)

The Velox docs site (`packages/site`) feels heavy because the chrome, the sidebar, and the content all try to show everything at once. This plan slims the information architecture first, then the pages that actually load work in the browser.

## Status

In progress on this branch:

- Sidebar is grouped: Start, Guides, Reference, For agents. Playground is a header link, not a sidebar essay.
- Themes no longer mounts the live canvas explorer or preview images. The page lists theme ids as text.
- The system prompt and the tag reference are separate pages (`/docs/markup-prompt`, `/docs/vml`).
- `prompt.mdx`, `code-prompt.mdx`, and `templates.mdx` are removed.
- Page chrome drops the background wash, code-block blur, and the extra body font weight.

Still open: docs search, and a single-canvas explorer if we want one later. It should stay off the first paint.

## What is wrong today

The site is a Fumadocs notebook layout (`packages/site/src/docs.tsx`). Every docs URL gets the same shell: top bar, left sidebar, page, and a right table of contents. `/` redirects straight to `/docs`. Search is turned off (`searchToggle.enabled: false`).

The sidebar is one flat list of nine items, plus Themes forced open with nine scenario links that are only in-page anchors (`#scenario-hero`, and so on). The header repeats Docs, Themes, and CLI, which are already in the sidebar.

Content types are mixed in that one list:

| Page | Lines | Job it actually does | Problem |
|------|------:|----------------------|---------|
| Overview | 45 | Pitch + docs map | Fine, but it is the homepage |
| Getting started | 80 | Tutorial and troubleshooting | Tutorial and mistakes share one page |
| Themes | 13 + explorer | How-to plus a live gallery | The page is a canvas app, not a short guide |
| Transitions, Preview, Rendering | 38–71 | How-to | Reasonable length, buried in a flat list |
| CLI | 77 | Reference | Sits next to essays with no “this is a lookup” cue |
| VML Prompt | 344 | System prompt plus full tag reference | Agents and humans read the same wall of text |
| Playground | 78 + editor | In-browser tool | Treated as another article |

Three more files exist and are not in the nav: `prompt.mdx` (399 lines), `code-prompt.mdx` (403), `templates.mdx` (203). They still ship with the content folder and make the docs feel unfinished.

The Themes page is the loaded part. `ThemesExplorer` compiles VML and draws portrait canvases for every visible theme and scenario (`RENDER_W` 360, nine scenarios, concurrent draw cap of 3). The sidebar stays expanded beside that gallery. Playground pulls the same engine into a docs page.

Visual chrome stacks on top: forced dark mode, three Google fonts (Syne, DM Sans, JetBrains Mono), page gradients, and code blocks with shadow plus `backdrop-filter`.

## What better docs sites do

Sources: [Diátaxis](https://diataxis.fr/), [Mintlify on navigation](https://www.mintlify.com/docs/guides/navigation), [Mintlify on content types](https://www.mintlify.com/docs/guides/content-types), [Fern on docs IA (Feb 2026)](https://buildwithfern.com/post/information-architecture-best-practices-documentation), [Stripe docs teardown](https://docsio.co/blog/stripe-api-docs-teardown), [progressive disclosure](https://www.stellae.design/en/ux/progressive-content-disclosure).

Rules worth taking:

1. **Four kinds of page, kept apart.** Tutorial (learn by doing), how-to (finish a task), reference (look something up), explanation (understand why). A page can link across kinds. It should not be all four.
2. **Task-first labels, 4–7 top-level groups.** Users arrive to install, pick a look, or render. Feature dumps and internal prompt files are not top-level items. Mintlify’s guide: more than about seven top-level choices makes people scan instead of choose. Critical pages stay within two clicks.
3. **Progressive disclosure, one or two layers.** Show the shortest path first. Put catalogs, edge cases, and full prompts behind a click, a tab, or a separate page. Hiding the common path, or adding a third click for a two-sentence answer, is the failure mode.
4. **Guides and reference can share one site until the volume forces a split.** Stripe separates them because the surface is huge. Velox is one product. One sidebar with clear sections is enough. Do not build a second docs site.
5. **Reference follows the product.** CLI commands, VML tags, and theme ids should read like a map of the engine, not like a blog post.
6. **Copy for agents is a button, not a chapter.** Stripe’s “copy for LLM” sits on the page you are already reading. Velox already has `/llms.mdx/docs/...`. The human nav does not need the raw system prompt.
7. **One task per page, plain language, a stable sidebar.** Search helps, and it does not replace a sidebar people can learn.

## Target structure

Five groups. Playground stays a tool in the header, not an essay in the list.

```
Start
  Overview
  Your first reel          (today’s Getting Started, tutorial only)

Guides
  Themes
  Transitions
  Preview
  Render and audio         (today’s Rendering)

Reference
  CLI
  VML tags                 (the “Full Reference” half of markup-prompt.mdx, split by tag family)
  Theme catalog            (names, ids, one still per theme)

For agents
  VML system prompt        (copy-paste block only, linked from Overview)
```

Removed from the primary tree:

- Theme scenario children in the sidebar. Scenarios stay as tabs or anchors inside the explorer.
- `prompt.mdx` and `code-prompt.mdx` as public pages. Fold anything still true into the VML reference or the agent prompt. Delete the rest after a diff, so two stale TypeScript grammars stop competing with VML.
- `templates.mdx` until templates are a real, maintained catalog. A page that is not in the nav should not sit in `content/docs`.

Header after the change: wordmark, Docs, Themes, Playground, GitHub. Drop the extra Docs / Themes / CLI links that duplicate the sidebar.

Overview becomes a short front door: one sentence, the minimal reel, three links (first reel, themes, CLI). The current “docs map” table goes away once the sidebar groups do that job.

## Page weight

**Themes.** Split the 13-line how-to from the gallery.

- Guide: one attribute, token colors, `velox list themes`, link to the catalog.
- Catalog: static PNGs that already exist under `packages/site/public/themes/`. Filter by category. No canvas until the user opens one theme.
- Explorer: one selected theme, scenario tabs, one live canvas. That replaces drawing a grid of videos on first paint.

**VML Prompt.** Split on the existing heading `## Full Reference`.

- Agent page: the fenced system prompt and a copy button. Link the markdown URL that already exists.
- Reference pages: Root, Scene, Text, Media, Charts, Motion, Reel blocks. Each page is a table of attributes plus one short example. The 100-line “complex reel” moves to one example page, not the top of the prompt.

**Playground.** Keep the editor. Drop the surrounding article, or cut it to three lines and a link to Getting Started. It should not carry its own table of contents beside a full-height editor.

**CLI.** Keep it as reference: command, flags, one example. Move “recommended workflow” to Getting Started so the reference page stays scannable.

## Chrome

- Stay on Fumadocs. Switch the docs layout from the notebook (content squeezed between two rails) to the standard docs layout: sidebar plus page, TOC only when the page has real headings. Themes catalog and Playground are full-width and have no TOC.
- Turn search on once pages have stable titles. Fumadocs search is enough. Do not add a second search product.
- One display font and one text font. Mono stays on code only.
- Flatten code blocks: border and radius, no backdrop blur and no large drop shadow.
- Allow the system color scheme. Dark can stay the default.

## Order of work

1. **Navigation only.** Group the existing pages in `DOCS_NAV` / `DOCS_TREE`. Close the Themes folder. Remove scenario links from the sidebar. Shorten the header. No rewrites yet. This is the change people will feel first.
2. **Split the prompt.** New reference pages from `markup-prompt.mdx`. Agent page keeps the copy block. Stop linking the old combined page.
3. **Retire orphans.** Diff `prompt.mdx` and `code-prompt.mdx` against the VML reference. Delete or redirect. Same for `templates.mdx` if it is not going into the nav.
4. **Lighten Themes.** Static catalog first, single-canvas explorer second. Measure first load before and after (theme page JS and long tasks).
5. **Layout and type.** Docs layout, search, font and code-block diet.
6. **Rewrite pass.** Getting Started loses the mistake list (move mistakes next to the command that causes them). Overview shrinks to the front door.

Do steps 1–3 before any visual redesign. A new skin on the current flat list will still feel bulky.

## Out of scope

- A marketing homepage. `/` can keep redirecting to Overview until someone asks for a landing page.
- A second docs framework (Mintlify, Fern, Nextra). The weight is the content tree and the live canvases, not Fumadocs itself.
- Rewriting the motion engine or the CLI as part of this plan.

## Done when

- Sidebar has the five groups above and no hash-only children.
- A new reader can go Overview → first reel → render without opening the VML prompt.
- Theme catalog first paint does not start a canvas draw for every card.
- The only full system prompt in the nav is one copy-paste page, and `/llms.mdx` still serves it.
- `prompt.mdx` and `code-prompt.mdx` are either merged or gone.
