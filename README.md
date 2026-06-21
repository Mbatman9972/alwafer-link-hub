# ALWAFER Link Hub

A fast, static link hub for TikTok bios. Each profile route renders **one approved
full-page artwork image (9:16)** with **transparent clickable hotspots** overlaid on
top — the visible page is the artwork, not a CSS recreation.

- **No backend, no database, no CMS, no build step.** Plain HTML + CSS + JavaScript.
- Original implementation — no third-party (e.g. Linktree) branding or assets.

---

## Routes / TikTok bio URLs

| Page | URL |
| --- | --- |
| **ALWAFER** | `https://alwafer-link-hub.vercel.app/?profile=mustafa` |
| **Team Ahmed Ramadan** | `https://alwafer-link-hub.vercel.app/?profile=ahmed` |
| **Hala Al-Saghir** | `https://alwafer-link-hub.vercel.app/?profile=hala` |

Route keys (`mustafa` / `ahmed` / `hala`) are unchanged. No profile selected → a small
functional selector page. Add `&hotspots=1` to outline the clickable zones for tuning.

---

## How it works

1. `config.js` maps each profile to its artwork image (`assets/page-*.png`) and holds a
   **shared hotspot map** (`OVERLAY`) plus the region/platform/apply URLs.
2. `app.js` renders one `<img class="profile-art">` inside an `.artwork-frame` and lays
   transparent `<a class="hotspot">` anchors over it using **percentage** positions, so
   everything scales on mobile while keeping the 9:16 ratio.
3. Screen-reader users get a `visually-hidden` block (title, subtitle, and every link).

There are **no** visible cards, headings, or monograms on profile routes.

---

## Editing (everything in `config.js`)

### Swap an artwork image
Drop the image in `assets/` and point the profile's `artwork:` at it (see
`assets/README.md` for exact file names).

### Tune the clickable hotspots
The zones live in `OVERLAY` as percentages of the frame:

```js
{ key: "apply", kind: "apply", label: "Apply to Join the Agency",
  top: 41.0, left: 8, width: 84, height: 6 },
```

Open `/?profile=mustafa&hotspots=1`, then adjust `top/left/width/height` until each
outline sits on the matching button in the artwork. All three profiles share this map.

### Activate a link
- **Region links** (MENA/UK/FR/DE/TR/CCA) are already active — edit `REGION_URLS`.
- **Platform links** (YouTube/TikTok/Telegram/Instagram/WhatsApp/Website) and **Apply**
  are placeholders: their hotspots exist but do not navigate (`href="#"`,
  `aria-disabled="true"`). Paste a real URL into `PLATFORM_URLS` / `WEBSITE_URL` /
  `APPLY_LINK` to make that hotspot active. Active external links open in a new tab with
  `target="_blank" rel="noopener noreferrer"`.

---

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell — loads styles + scripts. |
| `styles.css` | Black background, 9:16 frame, transparent hotspots, a11y utility. |
| `config.js` | Artwork paths, URLs, and the shared hotspot map. |
| `app.js` | Renders the artwork + overlays from `config.js`. |
| `assets/` | Approved page artwork (`page-*.png`) — see `assets/README.md`. |
| `vercel.json` | Serves the folder as a pure static site. |

---

## Deploy

Static site on Vercel (AVENGERS scope). After editing:

```bash
git add .
git commit -m "Update"
git push
```

Vercel redeploys automatically from the connected GitHub repo.

---

_Powered by ALWAFER Agency._
