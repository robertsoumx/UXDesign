# Jordan Spieth — accessible Wikipedia recreation

A complete, local recreation of the Jordan Spieth article with the original text and media, enlarged navigation controls, grouped article actions, searchable reference tables, and reading preferences.

## Run

```sh
npm install
npm run dev
```

Open **http://localhost:3000**. The complete generated page and its media are included in `public/`, so viewing the article does not require contacting Wikipedia. `PORT` can change the server port. A static web host can also serve `public/` directly.

## Content and attribution

- Source: https://en.wikipedia.org/wiki/Jordan_Spieth
- Preserved revision: **1370052022**, last edited August 18, 2026.
- The original download is in `wikipedia-source.html`.
- Article text is by Wikipedia contributors, licensed under **Creative Commons Attribution-ShareAlike 4.0**. The page footer links to the revision, contributor history, and license, and identifies the interface adaptations.
- All **92 article paragraphs**, **37 section headings**, **99 references**, the separate note, original statistical tables, navigation boxes, and **89 article image instances** are retained.
- `media-manifest.json` maps the 33 locally stored media assets (including the Wikipedia brand and footer assets) to their original URLs. Media links lead to the original Wikipedia file pages, where individual credits and licensing are available. Image licenses and Wikimedia trademarks are separate from the article text license.
- This is an independent interface recreation, not an official Wikipedia site. Account, donation, editing, discussion, history, search, and related article links go to their real destinations on Wikipedia or Wikimedia.

## Interface changes

- Contents links, disclosure buttons, account actions, article tabs, and appearance choices use targets of at least **44 × 44 CSS pixels** in the desktop layout.
- Sticky, scrollable contents panel with nested disclosures, a current-section indicator, and a mobile contents dialog.
- Distinct page-type and article-action groups retain the Article, Talk, Read, Edit, and View history actions.
- Appearance controls support three text sizes, two content widths, and light, dark, and system color modes.
- References are organized into numbered rows, retain every original citation and backlink, and can be filtered by text. Following a citation reveals its reference even if a filter had hidden it.
- Accessibility menu provides higher contrast, extra text spacing, stronger link underlines, reduced motion, a reading focus mode, a pointer/keyboard reading guide, and browser-based read-aloud controls.
- Native dialogs provide keyboard focus containment, Escape dismissal, and return focus. Contents selection sends focus to the selected heading. A skip link, accessible control names, semantic landmarks, table headers, image alternatives, and strong focus outlines support keyboard and assistive technology use.
- Reading preferences are stored locally. The page still renders its complete article when JavaScript is unavailable. Reference filtering, modal menus, and appearance changes require JavaScript.

## Rebuild and verify

```sh
npm run build
npm run verify
npm run verify:interactions
```

The build reads the saved source and regenerates `public/index.html`. It does not fetch a newer revision. If media are missing, run `pwsh -NoProfile -File scripts/download-media.ps1` to download the files listed in the manifest.

Verification compares paragraphs, headings, citations, statistical tables, and image identities with the original source. It checks image loading, anchor integrity, target dimensions, persisted preferences, keyboard focus, reference filtering and citation navigation, dialogs, and responsive widths from 320 to 1512 pixels. Playwright uses a local Chrome installation; accessibility checks use axe-core with WCAG 2.0, 2.1, and 2.2 A/AA tags. Screenshots and reports are written to `test-results/`.

Automated accessibility checks are a baseline, not a certification or a substitute for testing with assistive technology users. Read-aloud availability and voice quality depend on the browser and device. No live account or payment forms are implemented locally.
