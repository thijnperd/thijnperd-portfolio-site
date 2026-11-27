# Translation source — case studies and essays

Everything on this site is translated (English, Dutch, German) except the seven long-form documents:
the four case studies and the three essays. Their bodies are hard-coded English, which is why the
Dutch and German versions of those pages show a note saying so.

This file holds every translatable string from those seven pages, in reading order.

## How to work with it

- Translate the text after each marker, e.g. `[p] The calendar is the easy part` → translate
  "The calendar is the easy part".
- Keep the marker on the line; it is how the text is put back into the page.
- Keep the `### Section` headings as they are — they carry the section order. You can translate the
  quoted heading inside them; the `[h2]` line right below is the heading that is used.
- Keep line breaks between blocks. You can reflow a block across several lines if that is easier.
- **Do not translate** product and project names (Dither Studio, Cortex, W3Plan, PapersPlease,
  Three.js, Electron, Rust, WebGL, …), code in backticks, file names, numbers, or URLs.
- **Do not translate** the `[pager]` lines that are just project names (Cortex, W3Plan, …); the
  essay titles there do need translating.
- Leave the `[alt]` lines translated: they are read by screen readers.
- Nothing else in the file needs filling in. Add which language it is at the top, e.g.
  `Language: nl`, so it is unambiguous when several versions come back.
- Shell commands and code listings are left out of this file on purpose: they stay in English
  in every language, so there is nothing to do for them. Where a sentence runs into a listing,
  a `[code]` line marks the spot: leave it where it is and keep the punctuation around it as is.

Return the file as it is (same markers) and it gets wired into the matching pages.

---

## `work/dither-studio/index.html`

**Dither Studio**

[h1] Dither Studio
[lede] A dithering press for images and video that runs entirely on the machine it opens on: no account, no upload, no build step.
[spec · Role] Independent project
[spec · Stack] Vanilla JS, Canvas 2D
[spec · Status] Shipped, web and desktop
[alt] Dither Studio editor showing a dithered artwork on a dark canvas with algorithm, palette and effect controls in the left panel.
[caption] The editor at rest: an ordered dither on the canvas, with the algorithm, palette and effect stack in the left rail.

### Section 1 — "The brief"
[h2] The brief
[p] Dithering is the step between an image and the machine that prints it: reduce the palette, then decide which pixels get to keep which tone. It is the look of newsprint, early Macintosh screens, pixel art and a lot of album covers. The tools that do it are usually either a plugin inside a larger editor or a web converter that uploads your file and hands back a JPEG.
[p] Dither Studio is the opposite arrangement. You open a folder, drop in an image or a video, tune the result, and export. Nothing leaves the machine, and the dither is the product rather than an effect buried three menus deep.

### Section 2 — "Two rules that shaped everything"
[h2] Two rules that shaped everything
[li] No build step. The web build opens straight from `index.html`: plain scripts loaded from the folder, no bundler, no framework runtime to boot before the first pixel appears.
[li] No runtime dependencies in the web builds. Every algorithm, palette and export path is code in the folder. Nothing breaks because a package disappeared. The desktop build's only runtime dependency is Electron.
[p] Those rules are why the app can be handed over as a folder. They also set the ceiling: anything the app needs has to be written, not installed.

### Section 3 — "What is actually in it"
[h2] What is actually in it
[li] 46 dither algorithms, from ordered patterns to error diffusion.
[li] 30 built-in ink sets, plus five installable palette packs that add 25 palettes.
[li] Per-object layers on the desktop build, so a subject and a background can dither differently.
[li] A stack of up to 25 effects, each with its own amount and mode.
[li] Text mode, for turning an image into a grid of characters.
[li] Video in, WebM out, with the same stack applied per frame.
[li] Exports: PNG up to 8×, text grids, WebM, and a JSON recipe of the whole setup.
[alt] Four Dither Studio passes on the same portrait: radial glow, vertical CRT halftone, thermal posterization, and coarse warm ordered dither.
[caption] Four passes on the same portrait — radial glow, vertical CRT halftone, thermal posterization, and coarse warm ordered dither — produced with Dither Studio's algorithm, ink palette, and effect stack.
[alt] 1:1 crop comparison of three structure-aware screens on the same photograph: Matrix Rain, Ice Dot Field, and Smooth Diffusion.
[caption] 1:1 crop comparison of three structure-aware screens on the same photograph — Matrix Rain, Ice Dot Field, and Smooth Diffusion.

### Section 4 — "Three decisions"
[h2] Three decisions
[h3] Canvas 2D, not WebGL
[p] The engine is plain JavaScript working on pixel buffers: `process()` takes a source image and settings and returns the dithered result as data. Canvas 2D is only the surface it is drawn onto — one canvas pixel per working pixel, with `putImageData`, and zoom handled in CSS so a render is a single paste. No shader, no GPU-specific path. That is what lets the same engine file run unchanged in the web demo, the launcher and the desktop app.
[alt] Diagram of the pixel-buffer pipeline from PREPARE (RGBA source, tone adjustments, blur/sharpen, downsampling) through PRESS (dither and tone map) to FINISH (effects stack, glow, alpha, nearest-neighbour upscale).
[caption] The pixel-buffer pipeline (PREPARE → PRESS → FINISH) running inside `process()`, from tone prep and downsampling through dithering and the post-effect stack.
[h3] A recipe is a file
[p] The settings serialise into a plain JSON recipe: algorithm, palette, layer geometry and the effect stack. That makes a result reproducible without screenshots or notes, and it means the app's state is inspectable with a text editor. Recipes are also the closest thing the app has to a preset format — there is no account or cloud library to sync them through.
[h3] Three builds, one engine
[p] The web demo, the launcher and the desktop app share the engine, the sample table and the video clock byte for byte, and a sync script fails the build if a copy drifts. The shells are separate: the demo is tuned for a browser and ships six recipes with no plugins or custom palette import, while the desktop app adds native menus and dialogs, the full catalogue and the tutorial. Same engine, different amounts of app around it.
[alt] Dither Studio Electron desktop app running Bayer 8×8 on a 4-color Game Boy palette with native application menus and the 21-recipe inspector panel.
[caption] The Electron desktop shell running the same engine with native menus, Bayer 8×8 on a 4-color Game Boy ink set, and the 21-recipe inspector.

### Section 5 — "What local-only costs"
[h2] What local-only costs
[p] No sync, no shared preset library, no collaborative editing. Those are features I chose not to have, but they are not free: every one of them is something a user has to do by hand, usually by sending a file. The compensation is that the app opens instantly, works on a train, and cannot lose your work to a session expiry.
[p] The launch film was the best test of that promise: 40 seconds at 1080p and 24 fps, rendered directly from real engine exports rather than a mock-up. If the export path had a weak frame, it would be in the film.

### Section 6 — "Try it"
[h2] Try it
[p] The web app opens with a sample image and no sign-in. The source is public, and the launch film shows the video path end to end.
[p] For how the ordered-dither pass on this site works — 8×8 Bayer, twelve levels, two-CSS-pixel blocks — read The hero is dithered, not blurred.

### Pager titles
[pager] Selected work
[pager] Cortex

---

## `work/cortex/index.html`

**Cortex**

[h1] Cortex
[lede] A local-first browser that reads a folder of Markdown in place and shows six different views of the same notes. No database, no import, no account.
[spec · Role] Independent project
[spec · Stack] Rust, axum, WebGL2
[spec · Status] Windows desktop app, static web demo
[outcome] A 500-note vault with 5,000 links.
[alt] Cortex Brain view showing a 328-note vault rendered as a 3D cortical surface with folder clusters and wikilink tracts.
[caption] The Brain view: a 328-note vault folded into a cortical surface, with folders as clusters and wikilinks as tracts between them.

### Section 1 — "Notes outgrow folders"
[h2] Notes outgrow folders
[p] A vault of a few hundred Markdown files has structure, but not the structure the folder tree suggests. Notes written months apart connect; folders are just where they happened to be filed. Most tools answer this with search, or with a graph that is either a decorative hairball or a feature of a paid cloud service.
[p] Cortex takes the third option: read the folder as it is, parse the links, and give the same data several shapes. Nothing is imported and nothing is copied. If you delete the app, the notes are still exactly where they were.

### Section 2 — "Read in place, build once"
[h2] Read in place, build once
[p] Cortex points at a vault and parses it directly: Markdown files, frontmatter, wikilinks. That becomes one in-memory model for the session. There is no database to migrate and no index to rebuild — the folder is the source of truth.
[p] Layout is deterministic. The same vault produces the same map, which matters more than it sounds: a map that reshuffles every launch is a screensaver, not a way to remember where something lives. The stress-test vault is 5,523 notes across 41 folders, with 24,151 links.
[alt] Cortex Graph view showing the 5,523-note, 24,151-link vault across 41 folders rendered live in WebGL2.
[caption] The Graph view on the 5,523-note, 24,151-link stress-test vault (41 folders), rendered live in WebGL2.

### Section 3 — "Six views, one model"
[h2] Six views, one model
[p] Graph, brain, timeline, atlas, bento and decisions are projections of the same parsed vault, not six separate tools:
[li] Graph — what links to what, without the folder tree in the way.
[li] Brain — the vault as a folded surface, folders as regions.
[li] Timeline — when the notes were written, and what clusters in time.
[li] Atlas — folders as countries, notes as places, links as roads, on a map that grows the same way every time.
[li] Bento — every folder as a box, sized by how much of the vault it holds, with its strongest notes inside.
[li] Decisions — the reasoning trail behind a choice, kept next to the choice.
[alt] Cortex Atlas view rendering the 5,523-note vault as a cartographic map of 41 labeled folder countries connected by routes.
[caption] The Atlas view over the same 5,523-note vault — folders laid out deterministically as 41 countries, notes as places, and links as routes.
[alt] Cortex Bento view showing every folder sized proportionally, with Journal at 20%, Research at 3%, and Systems at 2% alongside top notes.
[caption] The Bento view sizing each folder proportionally (Journal 20%, Research 3%, Systems 2%) with its strongest notes surfaced inside.
[p] The decisions view is the one that changes how the vault gets used. A note that records a decision is only useful if the alternatives and the reason survive with it, and that is a data-shape problem before it is a visual one.
[alt] Cortex Decisions board beside an open YAML-frontmatter decision trail showing status, confidence, superseded notes, and load-bearing assumptions.
[caption] The Decisions board beside an open YAML-frontmatter decision trail showing status, confidence, superseded notes, and load-bearing assumptions.

### Section 4 — "Rust, WebGL2, and a local server"
[h2] Rust, WebGL2, and a local server
[p] The Rust core does the expensive part: scanning, parsing, link resolution and layout. An axum server exposes that to a hand-written WebGL2 interface, which is what makes thousands of nodes interactive rather than a static image. The app is a local server opened in your browser, bound to loopback by default, and the Windows build wraps it in an installer.
[code] left as is
[p] The GitHub Pages build is a static export of a seeded vault, so the views can be tried without installing anything.

### Section 5 — "What local-only costs"
[h2] What local-only costs
[p] The installer is Windows-only, there is no mobile app, and there is no sync between machines: iCloud, Dropbox, Syncthing or git have to do that job. Those are real limits. They are also the reason the app opens in a second and never asks for an account, and the reason a vault can be moved, backed up or versioned like any other folder. The wider case, across all four projects, is in Plain files, no accounts.

### Section 6 — "Try it"
[h2] Try it
[p] Open the live demo to move through the six views with the sample vault, or read the source.

### Pager titles
[pager] Dither Studio
[pager] W3Plan

---

## `work/w3plan/index.html`

**W3Plan**

[h1] W3Plan
[lede] A study and exam planner that starts from the school's actual test calendar instead of a blank week—started as a base app built by the three of us with Yannis Raijmakers and Billie, then developed further by Yannis and me for students at Were Di Drie.
[spec · Role] Team project · base app built with Yannis Raijmakers & Billie; continued by Yannis & me
[spec · Stack] React 19, TypeScript, Electron
[spec · Status] Built for Were Di Drie students
[outcome] Adopted by 8+ final-year students and praised by teachers.
[alt] W3Plan weekly calendar showing scheduled school exams, domain study blocks and upcoming test cards in the left sidebar.
[caption] A week with the school's exams already on it: domain study blocks on the calendar, tests and how many study hours are already planned in the sidebar.

### Section 1 — "Generic planners start too late"
[h2] Generic planners start too late
[p] A planner app assumes you already know what has to be done. At school, the hardest part comes earlier: the test calendar is published by the school, the study hours are supposed to be divided across subjects, and the two live in different places. Most students resolve this with a paper agenda and a screenshot.
[p] W3Plan starts from the school's PTA data and builds the week around it: exams, domain hours, per-test checklists and grade calculators in one place.

### Section 2 — "Public school data, private student data"
[h2] Public school data, private student data
[p] The split is deliberate. PTA data is published by the school, so it ships as a read-only local JSON dataset bundled with the app. A student's own schedule never leaves the device and there are no student accounts, which removes both the login flow and the reason to store anyone's data centrally.
[p] The import covers 643 PTA components across 29 subjects, 291 of which carry a date; a separate SE overview adds 133 test moments. That is small enough to ship as a read-only dataset and large enough that manual entry was never realistic.
[alt] W3Plan Period 2 overview spanning weeks 42 to 49 with a weekly busy-week workload indicator above chronological PTA exam rows.
[caption] Period 2 overview (wk 42–wk 49) combining a weekly workload bar (druk busy weeks) with chronological PTA exam moments, weights, and laatste kans markers.

### Section 3 — "What a week looks like"
[h2] What a week looks like
[li] A weekly calendar with school exams and study blocks side by side.
[li] Domain hours, so time is divided across subjects rather than by mood.
[li] Per-test checklists for what actually has to be learned.
[li] Grade calculators, because the next question after a test is what it did to the average.
[alt] W3Plan per-test modal for SE3 Straling, Quantum en Kern- en deeltjesprocessen (PTA 1605) showing study progress and split Doen and Kennen checklists.
[caption] A per-test workspace (SE3: Straling, Quantum en Kern- en deeltjesprocessen, PTA 1605) with progress tracking and split Doen (practice) and Kennen (theory) checklists.
[alt] W3Plan Cijfers tab listing recommended exam retakes ordered by how much each point raises the SE average above the weighted target-grade calculator.
[caption] The Cijfers tab ranking recommended retakes by how much each point raises the SE average (+0,35 for Nederlands, +0,25 for Wiskunde B), above the weighted target-grade calculator.

### Section 4 — "Two decisions"
[h2] Two decisions
[h3] Builds that update themselves
[p] The desktop builds auto-update, and ship as a Windows installer and as a DMG or ZIP on macOS (the ZIP is what the updater uses). Distribution is the least glamorous and most fragile part of a desktop app: installers, update channels and two platforms that fail in different ways. It is also the part that turns a project into something classmates can actually use.
[p] More on why the distribution was the hard part →
[h3] A bridge, not an autopilot
[p] W3Plan ships with a local MCP bridge so an assistant can read the week and propose study blocks. The proposals land in the calendar, where a student can review them like any other entry — the planner stays the place where the decision is made.
[alt] W3Plan Vandaag view displaying dashed Voorstel study block suggestions with one-click Zet erin confirmation buttons beside current study topics.
[caption] The Vandaag view showing proposed study blocks (Voorstel) waiting for one-click approval (✓ Zet erin) before entering the calendar.

### Section 5 — "What it cannot do"
[h2] What it cannot do
[p] There is no account and no sync: a schedule lives on the machine the app runs on. That is the trade for keeping student data off a server — no login, no cloud copy, nothing to expire — but it also means the week does not follow you to another computer.
[p] The PTA dataset is Were Di Drie's: 643 components across 29 subjects, bundled read-only with the build. Another school means another dataset, and a new school year means shipping the app with the new one.
[p] The MCP bridge is deliberately not an autopilot. It can read the week and suggest study blocks, but it cannot put them on the calendar; a student still approves each one.

### Section 6 — "In use"
[h2] In use
[p] W3Plan is a team project. Billie, Yannis Raijmakers and I built the base app together as a trio, and Yannis and I kept developing it further for senior secondary students at Were Di Drie — which meant the data model had to survive contact with a real school calendar rather than a sample one.
[blockquote] “This replaced my whole planning workflow, and it’s even easier now.”
[caption] Yannis Raijmakers Co-creator
[blockquote] “You can tell this was built on six years of learning to plan. It’s all in one app.”
[caption] Maths teacher Were Di Drie

### Section 7 — "Try it"
[h2] Try it
[p] Watch the walkthrough or get the builds from the installers repository.

### Pager titles
[pager] Cortex
[pager] PapersPlease

---

## `work/papersplease/index.html`

**PapersPlease**

[h1] PapersPlease
[lede] A literature crawler that searches five academic APIs, reads the abstracts, and keeps the papers that actually answer the question — for people and for coding agents.
[spec · Role] Independent project
[spec · Stack] Python 3.10+, standard library
[spec · Status] Open source
[alt] PapersPlease terminal UI showing six in-scope research papers, relevance scores, open-access and Sci-Hub links, and the abstract detail pane.
[caption] The terminal browser: in-scope papers with relevance scores, access links, and the abstract kept in view while deciding.

### Section 1 — "Search is not screening"
[h2] Search is not screening
[p] Academic search is good at finding papers that share vocabulary with a query and bad at knowing what the query meant. A search for strength training in older adults returns work on strength in children, work where strength is an outcome rather than an intervention, and reviews that cite the papers you actually wanted.
[p] PapersPlease adds the step that usually happens by hand: read the title and abstract, decide whether the paper is in scope, adjacent or irrelevant, and only then follow the link.

### Section 2 — "One pipeline, four surfaces"
[h2] One pipeline, four surfaces
[p] The same core sits behind four ways to use it:
[li] A CLI for a single query, with flags for count and interactivity.
[li] A TUI for moving through results and abstracts without leaving the terminal.
[li] A Python library for putting the pipeline inside another script.
[li] An MCP server so a coding agent can search literature as a tool call.
[p] Four surfaces is a constraint on the design: the screening logic cannot live in the CLI's output formatting or the TUI's widgets, so it sits in one place and every surface renders the same verdicts.
[alt] PapersPlease terminal live pipeline showing candidate counts arriving from epmc, crossref, openalex, and arxiv before abstract screening.
[caption] Live progress across the five pipeline stages as epmc, crossref, openalex, and arxiv return candidates before abstract screening.

### Section 3 — "Reading before downloading"
[h2] Reading before downloading
[p] PapersPlease queries Europe PMC, Crossref, arXiv, Semantic Scholar and OpenAlex, then screens each candidate's title and abstract for scope: does it study the population, intervention and outcome the query asked about, and does the causal direction match? Results are grouped as in-scope, adjacent or rejected, with a relevance score.
[p] For the papers that survive, it resolves open-access links and verifies that a download is actually a PDF rather than a landing page. A link that 404s is worse than no link, because it costs the same attention and returns nothing.
[code] left as is
[alt] Output of papersplease explain showing expanded synonym facets for unhealthy diet and type 1 diabetes, coverage threshold, and causal direction.
[caption] `papersplease explain` inspecting the offline scope contract — expanded synonym facets, coverage guard (≥ 0.70), and causal direction (unhealthy diet → type 1 diabetes).

### Section 4 — "Zero dependencies"
[h2] Zero dependencies
[p] The core runs on the Python standard library: HTTP, JSON, the CLI and the terminal interface. The only optional extra is PDF text extraction. That makes it installable anywhere Python exists, with no lockfile to rot and no transitive surprises. The trade-off is real — HTTP retries, terminal layout and argument parsing are written rather than imported — but it keeps the tool small enough to read in an afternoon.

### Section 5 — "What it cannot do"
[h2] What it cannot do
[p] This is a screening aid, not a systematic review. Abstracts omit methods, overstate findings and sometimes lie; the heuristics will put a relevant paper in the rejected group. Coverage is limited to the five sources it queries, and the final judgement is still reading the paper. The tool's job is to make that pile smaller and better labelled, not to replace it.
[alt] Full PapersPlease CLI scope report grouping candidates into IN SCOPE, ADJACENT, and REJECTED buckets with explanation lines for domain-sense exclusions.
[caption] The full CLI scope report separating IN SCOPE, ADJACENT, and REJECTED candidates — including domain-sense rejections like filtering out cardiac hypertrophy on a muscle-hypertrophy query.
[p] Why a tool like this writes nothing to a service, and what that buys and costs, is in Plain files, no accounts.

### Section 6 — "Try it"
[h2] Try it
[p] The repository has the install line, the CLI and TUI usage, and the MCP configuration.

### Pager titles
[pager] W3Plan
[pager] How the hero is dithered

---

## `writing/school-planner-distribution/index.html`

**A school planner is a distribution problem**

[crumb topic] Desktop · W3Plan
[kind] Essay
[h1] A school planner is a distribution problem
[lede] The calendar is the part you see. What made W3Plan usable was the school's data, an installer that updates itself, and a boundary that keeps student schedules on the device.
[spec · Published] 27 Nov 2026
[spec · Reading] 4 minutes
[spec · Topics] Desktop, distribution
[spec · Project] W3Plan

### Section 1 — "The calendar is the easy part"
[h2] The calendar is the easy part
[p] A planner app assumes you already know what has to be done. At school, the hardest question comes earlier: which tests are coming, which subjects they belong to, and how many study hours each one deserves. The school publishes a test calendar, the study hours are supposed to be divided across subjects, and the two live in different places. Most students resolve this with a paper agenda and a screenshot.
[p] W3Plan starts from the school's PTA export instead. Exams, domain hours, per-test checklists and grade calculators all sit on one calendar, because the calendar is already the shape the week has. The interface is the visible part. It is not the part that took the most care.

### Section 2 — "Import is the product"
[h2] Import is the product
[p] The current import covers 643 PTA components across 29 subjects. 291 of those carry a date; a separate SE overview adds 133 test moments. That is too much to enter by hand and small enough to ship as a read-only dataset. The app loads it directly from a bundled local JSON dataset.
[p] This is the difference between a demo week and a real one. Once the school's exams are on the calendar, a study block has something to divide. Without the import, the planner is a nicer-looking blank page; with it, the first screen already knows the week.

### Section 3 — "The privacy boundary simplifies the architecture"
[h2] The privacy boundary simplifies the architecture
[p] PTA data is published by the school, so it is treated as public and read-only. A student's own schedule is not. It stays on the device, and there are no student accounts. That one decision removes the login flow, the session expiry, the password reset and the reason to keep a copy of anyone's week on a server.
[p] It also removes a feature: there is no account sync between machines, so the schedule lives with the device it was made on. That is a real cost, but it is the kind of cost that can be explained in a sentence. A planner for a school week does not need a multi-tenant backend to be useful.

### Section 4 — "Distribution is the feature"
[h2] Distribution is the feature
[p] The desktop builds auto-update. They ship as a Windows installer and as a DMG or ZIP on macOS; the ZIP is what the updater uses. Installing and updating turn out to be the least glamorous and most fragile part of the app: two platforms, two sets of failure modes, and no way to fix a bad release by editing a server.
[p] A web build avoids installers, but it does not remove the data boundary: the schedule still has to stay on the device rather than becoming a server session. The desktop build is the version that reaches a classroom laptop and keeps its files there. The cost is that distribution becomes the product.

### Section 5 — "Eight students is a real test"
[h2] Eight students is a real test
[p] W3Plan was built for senior secondary students at Were Di Drie. It has been adopted by 8+ final-year students and praised by teachers. That is not a mass market, but it is enough to test the parts a sample week never does: a real PTA export, a real exam period, and a real student deciding whether to trust the plan.
[p] The project is a team effort. Billie, Yannis Raijmakers and I built the initial base app together, and Yannis and I kept developing it out for the school. The division mattered less than the shared constraint: the data model had to survive contact with a real school calendar.

### Section 6 — "What is still missing"
[h2] What is still missing
[p] There is no mobile app, no account sync, and the import is shaped by one school's data. Those are the same boundaries as the local-first choice, seen from the other side. Adding another school would mean mapping another export, not adding another view to the calendar.
[p] That is the lesson worth keeping: for a tool built around an institution, start with the data and the install. The calendar is the last thing to polish, not the first. W3Plan is at its best when the school's data is already there and the student only has to decide what to do with the week.

### Pager titles
[pager] Plain files, no accounts
[pager] The hero is dithered, not blurred

---

## `writing/dithering-the-hero/index.html`

**The hero is dithered, not blurred**

[crumb topic] Rendering
[kind] Essay
[h1] The hero is dithered, not blurred
[lede] The scene on the home page is a normal Three.js render that is then quantised down to twelve levels per channel with an 8×8 Bayer pattern. That single pass is most of the look.
[spec · Published] 27 Nov 2026
[spec · Reading] 8 minutes
[spec · Topics] GLSL, rendering, Three.js
[spec · Source] GitHub ↗
[alt] The home page at midnight: a dithered sky with a full moon, a laptop on a desk by the water, and the name Thijn Köhne in large white type.
[caption] Midnight on the home page. The sky is where the dither is easiest to see: a gradient that would normally band is broken into a pattern instead.

### Section 1 — "Why dither at all"
[h2] Why dither at all
[p] A smooth gradient is one of the hardest things to show on an 8-bit display. Step through a sky slowly enough and the rounding errors line up into visible bands. The usual fix is to add noise, which trades banding for grain.
[p] Dithering makes the trade on purpose. Reduce the palette to a deliberately small number of levels, then choose which level each pixel gets based on its brightness and a threshold pattern. At a distance the eye averages the pattern back into a tone; up close it is a texture. That texture is the point, not a side effect.
[p] The hero uses twelve levels. Few enough that the pattern is visible, many enough that skin, wood and water still read as themselves.

### Section 2 — "Bayer, without the lookup table"
[h2] Bayer, without the lookup table
[p] Ordered dithering uses a fixed matrix of thresholds: an 8×8 grid of values that repeats across the screen. The usual implementation stores 64 numbers in an array or a texture. The shader builds the same pattern recursively instead, from one two-by-two function:
[code] left as is
[p] Each step halves the coordinate, evaluates the smaller pattern, and folds it back in at a quarter of the weight. The result is a 64-value threshold field in the range 0–1, generated from a few instructions and no memory. Subtracting 0.5 turns it into the signed offset the quantiser wants.
[p] The pattern is why the result reads as print rather than television static. Noise varies per pixel and per frame; Bayer repeats, so the eye can lock onto it and the image holds still even when the camera moves.

### Section 3 — "One pass, after the tone map"
[h2] One pass, after the tone map
[p] The scene is rendered normally, tone-mapped and converted to display space by an `OutputPass`, and only then handed to the dither pass, so the levels are quantised in display space rather than the linear space the scene was lit in.
[p] The pass does not sample each pixel independently. It snaps to a block first, then samples the centre of that block:
[code] left as is
[p] That detail matters. If every pixel sampled its own colour and then quantised, the pattern would sit on top of the full-resolution image and the edges would turn to mush. Sampling the block centre first means the whole block shares one input colour, so the dither grid itself becomes the resolution of the image. It is a deliberate drop in spatial detail to gain a stable, crisp texture.

### Section 4 — "The grid is two CSS pixels wide"
[h2] The grid is two CSS pixels wide
[p] The block size is set in device pixels and scaled by the device pixel ratio, because `gl_FragCoord` is measured in device pixels too. Without that scale, the same shader would produce a grid half as wide on a retina screen and the dither would almost disappear.
[p] The pixel ratio used by the renderer is capped at 1.5, and the block is set to `2.0 × dpr` (2.2 on narrow screens). So the grid stays roughly two CSS pixels on a phone, a laptop and a 4K monitor.

### Section 5 — "The palette moves with the scene"
[h2] The palette moves with the scene
[p] Dithering is only half of the look. The other half is that the twelve levels are not fixed colours: the scene's atmosphere is sampled across four keyframes — daylight at 0, golden dusk at 0.46, twilight at 0.66, midnight at 1 — and every colour in the scene is interpolated between them with a smoothstep.
[p] The same scalar drives the page. A separate pair of light and dark palettes is sampled on the CPU and written to CSS custom properties, so the paper, ink and accent of the sections below the hero move with the sky. The favicon and the browser theme colour change too. One number, one light.
[p] That is also why the dial can be dragged instead of toggling a theme. There is no discrete dark mode to switch: there is a time of day, and everything samples it.

### Section 6 — "What it costs"
[h2] What it costs
[p] The post pass is cheap; the scene is not. A full Three.js scene with a custom ripple plane, particles and a composer is a lot of work for a background, so the module is loaded on idle rather than in the first payload, the renderer pauses when the hero scrolls out of view or the tab is hidden, and visitors with Save-Data get a static background instead. With `prefers-reduced-motion`, the clock stops: no drift, no entrance, no ripples, but the dither remains.
[p] One anti-flicker detail worth keeping: the paper grain added after quantisation is hashed from the block coordinate, not from time. Per-frame noise on a static pattern sparkles; per-block noise looks like paper tooth.

### Section 7 — "Read it"
[h2] Read it
[p] The pass is in `src/hero/dither.js`, the palette in `src/hero/atmosphere.js`, and the order of passes in `src/hero/HeroScene.js`. The source for the site is on GitHub.

### Pager titles
[pager] A school planner is a distribution problem
[pager] Plain files, no accounts

---

## `writing/plain-files/index.html`

**Plain files, no accounts**

[crumb topic] Local-first
[kind] Essay
[h1] Plain files, no accounts
[lede] Four projects, one rule: the data belongs in a folder the person can inspect, move and back up without asking a server for permission.
[spec · Published] 27 Nov 2026
[spec · Reading] 7 minutes
[spec · Topics] Local-first, file formats
[spec · Projects] Four

### Section 1 — "The default is somebody else's computer"
[h2] The default is somebody else's computer
[p] Most software now assumes an account. Notes, images, plans and research live in a service, in a format the service defines, reachable while the service is reachable. It is a good deal for synchronisation, and a bad one for everything else: the tool can disappear, the format can change, the price can move, and the data cannot be opened without the app that wrote it.
[p] The four projects on this site point the other way. Not because the cloud is evil, but because for these particular tools the local version is simpler, faster and easier to trust. The file is the interface.

### Section 2 — "What that looks like in practice"
[h2] What that looks like in practice
[li] Dither Studio's web build opens from its own folder with no build step and no runtime dependencies. A finished piece exports as PNG, text, WebM or a JSON recipe; the recipe is the whole setup, readable in any editor.
[li] Cortex reads a vault of Markdown where it already lives. There is no import, no database and no copy. If the app is deleted, the notes are untouched.
[li] W3Plan keeps a student's schedule on the device. The school's PTA data ships as a read-only JSON dataset, kept separate from a student's own schedule.
[li] PapersPlease writes nothing to a service at all. It queries public APIs, links to open-access papers, and leaves the reading to you.

### Section 3 — "What it buys"
[h2] What it buys
[p] It opens. No session check, no loading state, no "contact your administrator". A folder of static files is the fastest kind of app there is.
[p] It works offline. On a train, in a basement, on a school network that blocks everything. The tool does not care, because nothing essential is remote.
[p] The files outlive the app. Markdown, PNG, WebM and JSON are readable without this codebase. That is the real exit plan: not a data export feature, but data that never needed exporting.
[p] Backups are boring. A folder can be copied, zipped, put in git or dropped on a USB stick. There is no restore flow to test and no account recovery to lose.
[p] There is no permission model. No sharing settings, no roles, no link that is accidentally public. Access is whatever the filesystem says it is.

### Section 4 — "What it costs"
[h2] What it costs
[p] No sync. Two machines mean two copies, and merging them is the user's problem. This is the biggest cost and the one that rules out some products entirely.
[p] No collaboration. Two people editing the same file at the same time is a hard problem, and "put it in a shared folder" is not a solution. A tool that needs real-time collaboration needs a server; pretending otherwise just moves the conflict.
[p] You own the backups. Local-first means the failure mode is local too. A deleted folder is gone unless the person made a copy.
[p] Distribution is on you. Installers, updates and code signing are the unglamorous tax on desktop software. W3Plan ships auto-updating builds for Windows and macOS, and that machinery took more care than some of the features.
[p] Local compute has a ceiling. Anything that needs a large model or a lot of CPU is harder without a server, and sometimes not worth doing locally at all.

### Section 5 — "Where the cloud earns its place"
[h2] Where the cloud earns its place
[p] W3Plan is a clean example of that boundary. The school's PTA calendar is published data that every student needs and no student should edit. Shipping it as a read-only JSON dataset — separate from the student's own schedule and updated when the school publishes a new export — keeps the division clear because the data has an owner and a direction: published by the school, consumed by the app, never written back.
[p] That is a reasonable rule of thumb. Data a person creates stays local. Data an institution publishes can be fetched. Data two people must edit at once needs a real sync model, and the product should say so rather than pretend a folder is one.

### Section 6 — "The test"
[h2] The test
[p] A simple question decides most of these cases: if the service disappeared tomorrow, what would the user still have? If the answer is "a folder of files that open in anything", the design is probably right. If the answer is "a login screen", it is worth asking what the account is actually buying.
[p] The projects are linked from the work section; each has a longer write-up, including the parts where local-first was the harder choice.

### Pager titles
[pager] The hero is dithered, not blurred
[pager] A school planner is a distribution problem
