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
| **ALWAFER** | `https://alwafer-link-hub.vercel.app/alwafer/` |
| **Team Ahmed Ramadan** | `https://alwafer-link-hub.vercel.app/ahmed/` |
| **Hala Al-Saghir** | `https://alwafer-link-hub.vercel.app/hala/` |

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

Open `/alwafer/?hotspots=1`, then adjust `top/left/width/height` until each
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

## Admin dashboard (`/admin`)

Manage every link without touching code at **`/admin`**. Sign in, pick a page
(ALWAFER / Team Ahmed Ramadan / Hala Al-Saghir), then for each row (Apply,
YouTube, TikTok, Telegram, Instagram, WhatsApp, Website) toggle it on/off, paste
its web address, and Save. You can also edit the shared region links
(MENA/UK/FR/DE/TR/CCA), export/import a JSON backup, and preview each public page.

- Disabled links (or links with no address) are visible in the artwork but do
  **not** navigate. Enabled links with a valid address become clickable.
- Saving commits `data/link-settings.json` to GitHub; Vercel redeploys and the
  public pages pick up the change automatically.

### Roles (three accounts)
Sign in at `/admin` by choosing an account + password:

| Account | Role | Can edit |
| --- | --- | --- |
| **ALWAFER** (`mustafa`) | owner | all three profiles' links **+ shared region links** |
| **Team Ahmed Ramadan** (`ahmed`) | profile | only the Ahmed profile links |
| **Hala Al-Saghir** (`hala`) | profile | only the Hala profile links |

Permissions are enforced **server-side** — Ahmed/Hala cannot edit ALWAFER, each
other, or the region links even with a crafted request. Individual admin URLs are
`/admin/alwafer/`, `/admin/ahmed/`, and `/admin/hala/`. The unscoped `/admin`
route remains the owner's full control room. Legacy `?profile=` admin URLs redirect
to their canonical individual routes.

### How persistence works
The public pages read `data/link-settings.json`. The admin API
(`/api/admin/login|logout|me|settings`) authenticates you with an HttpOnly signed
cookie that carries your user key + role, and commits changes to that one file on
GitHub `main`. **No secrets are in the browser** — tokens and password hashes live
only in Vercel env vars.

### Required environment variables (set in Vercel, AVENGERS scope)
The admin UI and API are deployed, but sign-in and saving stay disabled until
these are set:

| Variable | Purpose |
| --- | --- |
| `ALWAFER_ADMIN_USERS_JSON` | The three users with **sha256 password hashes** (see below). |
| `ALWAFER_COOKIE_SECRET` | Random secret that signs the session cookie. |
| `GITHUB_TOKEN` | Fine-grained PAT, Contents: Read+Write on this repo. |
| `GITHUB_OWNER` | `Mbatman9972` (default) |
| `GITHUB_REPO` | `alwafer-link-hub` (default) |
| `GITHUB_BRANCH` | `main` (default) |

`ALWAFER_ADMIN_USERS_JSON` shape (passwords are never stored — only sha256 hashes):

```json
{
  "mustafa": { "displayName": "ALWAFER", "role": "owner", "passwordHash": "<sha256>" },
  "ahmed":   { "displayName": "Team Ahmed Ramadan", "role": "profile", "profile": "ahmed", "passwordHash": "<sha256>" },
  "hala":    { "displayName": "Hala Al-Saghir", "role": "profile", "profile": "hala", "passwordHash": "<sha256>" }
}
```

(Alternatively set `ALWAFER_OWNER_PASSWORD_HASH` / `ALWAFER_AHMED_PASSWORD_HASH` /
`ALWAFER_HALA_PASSWORD_HASH`.) URLs are validated server-side: only `http://`,
`https://`, `mailto:`, `tel:`, and `#` are allowed.

---

_Powered by ALWAFER Agency._
