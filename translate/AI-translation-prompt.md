# Prompt: translate the case studies and essays into Dutch and German

Copy everything below the line into a new chat with a capable model, attach
`translate/case-studies-and-essays.md`, and send it. It asks for two `.md` files back.

---

You are translating the long-form copy of a personal portfolio site written by Thijn Köhne, a Dutch
software developer. The site is already translated into Dutch and German everywhere except its seven
long-form documents, which are still English-only. Your job is to produce those translations.

## What you get

- An attached file, `case-studies-and-essays.md`. It contains every translatable string from seven
  pages: four project case studies and three essays. It is the **only** source of truth for the text.
- The live pages, if you want context for a screenshot or a diagram caption:
  - https://thijnperd.github.io/work/dither-studio/
  - https://thijnperd.github.io/work/cortex/
  - https://thijnperd.github.io/work/w3plan/
  - https://thijnperd.github.io/work/papersplease/
  - https://thijnperd.github.io/writing/school-planner-distribution/
  - https://thijnperd.github.io/writing/dithering-the-hero/
  - https://thijnperd.github.io/writing/plain-files/

  If a page and the file disagree, follow the file. Do not fetch anything else, and do not add links
  or facts of your own.

## What to produce

Two files, nothing else in them:

| File | Language |
| --- | --- |
| `case-studies-and-essays.nl.md` | Dutch (Netherlands, `nl-NL`) |
| `case-studies-and-essays.de.md` | German (`de-DE`) |

Each file must have **exactly the same structure** as the source: the same `##` page headings, the
same `### Section N — "…"` lines, the same markers, in the same order, and the same number of
translating lines (271 markers per file). Do not summarise, merge, split, reorder, add or drop blocks.
Do not wrap the file in code fences.

Each file starts with one line naming the language, then the documents:

```
Language: nl
```

## How the file is structured, and what to touch

Every translatable string is one line starting with a marker in square brackets:

```
[p] A planner app assumes you already know what has to be done.
[h2] The calendar is the easy part
[li] No build step. The web build opens straight from `index.html` …
[caption] The editor at rest: an ordered dither on the canvas …
[alt] Dither Studio editor showing a dithered artwork on a dark canvas …
[spec · Role] Independent project
[outcome] A 500-note vault with 5,000 links.
[pager] The hero is dithered, not blurred
```

- **Translate only the text after the marker.** Leave the marker exactly as it is, including its
  spacing and the `·` in spec lines.
- Keep one block per line. Long paragraphs may stay on one long line; that is fine.
- `[h2]` is a real section heading and must be translated. The `### Section N — "…"` line above it is
  only a table of contents; leave that line untouched.
- `[alt]` lines are read aloud by screen readers. Translate them so they describe the same image, and
  keep them about as long as the original.
- `[caption]` lines describe figures; translate them as captions, not as sentences to expand.
- `[spec · …]` lines are metadata values. Translate the value (e.g. "Reading" → "8 minuten"), not the
  label inside the marker, and leave dates and version numbers alone.
- `[code] left as is` marks a code listing that is not translated. Leave the line as it is; the
  sentence before it ends with a colon on purpose.
- `[pager]` entries that are only a product name (Cortex, W3Plan, PapersPlease, Dither Studio) stay
  unchanged. Essay titles there are translated.

## Style and voice

The English is dry, concrete and technical: short declaratives, no marketing adjectives, no
exclamation marks, no "revolutionary", no "seamless". Keep that register. Translate meaning, not
words: a Dutch sentence that reads like translated English is a failure, and so is one that drops a
qualifier the author put there. Keep the author's hedges ("usually", "roughly", "most", "the cost is")
and his negatives ("no account", "nothing leaves the machine") — they carry the argument.

- **Dutch:** informal, second person `je`/`jouw` where the English says "you", never `u`. This
  matches the rest of the site ("… die je zelf kunt bekijken"). Use `één` for the number one where it
  would otherwise be ambiguous.
- **German:** impersonal. The existing German copy does not address the reader; rewrite "you" with
  `man`, the passive, or an impersonal construction rather than `du` or `Sie`. Keep sentences shorter
  than the Dutch ones tend to be.
- Both: typographic punctuation. Dutch uses `‘…’` and `“…”`, the German `„…“`; use the en dash `–`
  for ranges and the em dash `—` where the English uses one. `ij`/`IJ` in Dutch is one letter for
  capitalisation purposes (`IJssel`, `IJburg`).

## Terminology (match the rest of the site)

| English | Dutch | German |
| --- | --- | --- |
| local-first | local-first (lowercase, hyphenated) | Local-first (capitalised as an adjective: „Local-first-Software”) |
| case study | casestudy (plural: casestudy’s) | Fallstudie |
| essay / writing (section) | essay / Artikelen | Essay / Artikel |
| work (section) | Werk | Projekte |
| notes / notebook | notities | Notizen |
| vault | vault (keep; „notitiemap” only if a sentence needs it) | Vault (keep; „Notizordner” only if a sentence needs it) |
| folder | map | Ordner |
| dithering, Bayer, halftone | dithering, Bayer, halftoon | Dithering, Bayer, Rasterton |
| shader, pass, tone map | shader, pass, tone map | Shader, Pass, Tonemapping |
| installer, update | installer, update | Installer, Update |
| schedule / timetable | rooster | Stundenplan |
| study block, study hours | studieblok, studie-uren | Lernblock, Lernstunden |
| test / exam | toets / examen (SE and PTA stay as they are) | Klausur / Prüfung (SE and PTA stay as they are) |
| source code, repository | broncode, repository | Quellcode, Repository |

## Never translate or change

- Product and project names: Dither Studio, Cortex, W3Plan, PapersPlease, Three.js, Electron, Rust,
  axum, WebGL2, Canvas 2D, GitHub, iCloud, Dropbox, Syncthing, Jumbo Supermarkten, Were Di Drie,
  Yannis Raijmakers, Billie, Thijn Köhne.
- Anything inside backticks (`index.html`, `process()`, `cargo run -p cortex -- serve ./vault`,
  `gl_FragCoord`, `2.0 × dpr`, …), file paths, URLs and e-mail addresses.
- Numbers, units and identifiers: 8×8, 12 levels, 1080p, 24 fps, 5,523 notes, 24,151 links, 643 PTA
  components, 29 subjects, 291 dates, 133 test moments, 8+, 46 algorithms, 25 effects. Use the locale
  convention for thousands separators where the source uses one (Dutch and German: `5.523`), but do
  not change the value.
- Dates: 27 Nov 2026 stays a date; write it the way the locale writes dates (`27 nov 2026` in Dutch,
  `27. Nov. 2026` in German) and keep the day.
- The `### Section`, `##` and `---` structural lines.

## Checks before you hand the files back

1. Each file has the same number of lines as the source and 271 marked blocks — count them.
2. No marker was translated, renamed, merged or dropped; the `[spec · …]` labels are untouched.
3. No paragraph was left in English, except the allowed names and code above.
4. Every `[alt]` and `[caption]` line is translated.
5. No sentence adds a claim, a number, a link or an example that is not in the source, and none drops
   a clause.
6. Dutch uses `je`, German addresses nobody directly.
7. The files are UTF-8, LF line endings, no BOM, no code fences, no commentary inside the documents.

If something in the source is genuinely ambiguous — a figure you cannot see, a term with two equally
good translations — translate it the most plausible way and list the question at the very end of the
file, after a final `---`, under a heading `## Questions for Thijn`. Do not put notes anywhere else.

Return the two files as downloads or as complete file contents, and nothing else.
