# Jordan Spieth — accessible Wikipedia recreation

A complete, local recreation of the Jordan Spieth article with the original text and media, enlarged navigation controls, grouped article actions, searchable reference tables, and reading preferences.

## Run

```sh
npm install
npm run dev
```

Open **http://localhost:3000**. The complete generated page and its media are included in `public/`, so viewing the article does not require contacting Wikipedia. `PORT` can change the server port. A static web host can also serve `public/` directly.

## GitHub Pages

The site is ready for the repository's project URL, **https://robertsoumx.github.io/UXDesign/**. No custom domain, backend, API key, or additional production service is required. All stylesheets, scripts, images, and metadata use relative paths so they work beneath `/UXDesign/`.

Two publishing configurations are supported:

1. **Deploy from a branch → main → / (root):** Keep this setting if it is already enabled. Commit and push the changes, including the generated root `index.html`, `public/`, and `.nojekyll`. The root entry contains the complete article and loads its assets from `public/`.
2. **GitHub Actions:** Select this source in Settings → Pages. The included `.github/workflows/pages.yml` builds and verifies the article, uploads only `public/`, and deploys on pushes to `main`. It can also be started manually from Actions → Deploy GitHub Pages.

Run `npm run build` before committing source changes to update both HTML entry points. The Actions workflow also rebuilds from the saved source. The root HTML is generated; do not edit it independently. The build works on Windows and on the workflow's Linux runner. The site has been checked locally at a project subpath in both publishing modes; a live deployment requires the changes to be pushed to GitHub.

GitHub's documentation explains [branch publishing and Actions publishing](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

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
- Back to top, Reset appearance, Hide/Show, On this page, section edit actions, footer links, and category links have visible button boundaries. Contents entries use separated cards with numbered markers; On this page opens the full contents dialog.
- Sticky, scrollable contents panel with nested disclosures, a current-section indicator, and a mobile contents dialog.
- Distinct page-type and article-action groups retain the Article, Talk, Read, Edit, and View history actions.
- Appearance controls support three text sizes, two content widths, and light, dark, and system color modes.
- References are organized into numbered rows, retain every original citation and backlink, and can be filtered by text. Following a citation reveals its reference even if a filter had hidden it.
- Data tables have clear column and row headers, generous spacing, sticky headings and row labels, row counts, scroll hints, large horizontal scroll buttons where needed, and an expanded table dialog. Original values and result colors are retained.
- The nine bottom navigation groups use native expandable cards. Their links are separated into readable grids with large targets; all original destinations, labels, nested groups, and media are retained. The template toolbar's abbreviated v/t/e controls are labeled View/Talk/Edit.
- Accessibility menu provides higher contrast, extra text spacing, stronger link underlines, reduced motion, a reading focus mode, a pointer/keyboard reading guide, and browser-based read-aloud controls.
- Native dialogs provide keyboard focus containment, Escape dismissal, and return focus. Contents selection sends focus to the selected heading. A skip link, accessible control names, semantic landmarks, table headers, image alternatives, and strong focus outlines support keyboard and assistive technology use.
- Reading preferences are stored locally. The page still renders its complete article when JavaScript is unavailable. Reference filtering, modal menus, and appearance changes require JavaScript.

## Rebuild and verify

```sh
npm run build
npm run verify:content
npm run verify
npm run verify:interactions
npm run verify:enhancements
```

The build reads the saved source and regenerates `public/index.html`. It does not fetch a newer revision. If media are missing, run `pwsh -NoProfile -File scripts/download-media.ps1` to download the files listed in the manifest.

Verification compares paragraphs, headings, citations, statistical tables, and image identities with the original source. It checks image loading, anchor integrity, target dimensions, persisted preferences, keyboard focus, reference filtering and citation navigation, dialogs, and responsive widths from 320 to 1512 pixels. Playwright uses a local Chrome installation; accessibility checks use axe-core with WCAG 2.0, 2.1, and 2.2 A/AA tags. Screenshots and reports are written to `test-results/`.

`verify:content` runs without a browser or server and is part of the Pages build. Browser checks require the local server to be running. `verify:enhancements` additionally checks enlarged sidebar buttons, expanded tables, open related-navigation cards, and both Pages publishing configurations at a simulated `/UXDesign/` subpath, including the permanent-link metadata fetch.

Automated accessibility checks are a baseline, not a certification or a substitute for testing with assistive technology users. Read-aloud availability and voice quality depend on the browser and device. No live account or payment forms are implemented locally.
