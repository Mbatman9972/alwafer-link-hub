# ALWAFER Link Hub

A fast, static, mobile-first "link hub" for TikTok bios — black/gold luxury design,
**English + Arabic** with an EN / العربية toggle (Arabic renders RTL). Three profiles,
shared agency region links, and an "Apply to Join the Agency" button.
Everything is controlled from one file: **`config.js`**.

- **No backend, no database, no CMS, no build step.** Plain HTML + CSS + JavaScript.
- Original design — no third-party (e.g. Linktree) branding or assets.

---

## Profiles & TikTok bio URLs

| Page | URL to put in the TikTok bio |
| --- | --- |
| **ALWAFER** (brand) | `https://alwafer-link-hub.vercel.app/?profile=mustafa` |
| **Team Ahmed Ramadan** | `https://alwafer-link-hub.vercel.app/?profile=ahmed` |
| **Hala Al-Saghir** | `https://alwafer-link-hub.vercel.app/?profile=hala` |

> The route keys (`mustafa` / `ahmed` / `hala`) stay the same, but the **displayed**
> name for `?profile=mustafa` is **ALWAFER** — the word "Mustafa" is never shown.
> The hash form also works: `…/#mustafa`, etc. Add `?lang=ar` to open in Arabic.
> Visiting with no profile shows a selector page with all three.

---

## Everything is edited in `config.js`

Open **`config.js`**. You never need to touch the other files.

### Names, subtitles, taglines (bilingual)
Each profile has English + Arabic values. Edit the text in quotes:

```js
ahmed: {
  title:    { en: "TEAM AHMED RAMADAN", ar: "فريق أحمد رمضان" },
  subtitle: { en: "Official Agency Network", ar: "شبكة الوكالة الرسمية" },
  tagline:  { en: "Official regional agency links and joining access.",
              ar: "روابط الوكالة الإقليمية الرسمية وإمكانية الانضمام." },
  ...
}
```

### Profile photos
Drop the image into `assets/` and point `image:` at it (already wired):

```js
image: "assets/profile-ahmed.jpg",
```

- Until the file exists, a premium glowing gold **monogram** (from `initials`) shows.
- If an image URL is broken, it falls back to the monogram automatically.
- See `assets/README.md` for the exact file names.

### Turn a platform link ON
Each profile shows six platform slots — **YouTube, TikTok, Telegram, Instagram,
WhatsApp, Website** — always visible. A slot becomes a real, tappable link only when
you paste a `url` and set `enabled: true`:

```js
{ key: "youtube", label: "YouTube", url: "https://youtube.com/@you", enabled: true },
```

Until then the slot shows as a disabled placeholder (visible, but it does **not**
navigate — no broken links).

### The Apply button URL
Near the top of `config.js`, replace the placeholder:

```js
var APPLY_LINK = "#apply-link-to-be-added";   // <- put the real apply URL here
```

To hide Apply for one profile, set `applyEnabled: false` on it.

### Shared agency region links (chips)
The six region chips appear on every profile. Edit them once near the top:

```js
var SHARED_AGENCY_LINKS = [
  { region: "MENA", url: "https://www.tiktok.com/t/ZMAN6Bu2W/", enabled: true },
  { region: "UK",   url: "https://www.tiktok.com/t/ZSxoyPd4W/", enabled: true },
  ...
];
```

> The first region label is **MENA** — Middle East & North Africa, spelled M-E-N-A.
> To hide region chips for one profile, set `showSharedAgencyLinks: false` on it.

### Default language
```js
defaultLang: "en",   // or "ar"
```
Visitors can switch any time with the EN / العربية toggle (their choice is remembered).

---

## Add a fourth profile

1. Add a new key inside `profiles` (the key is the URL value):

```js
sara: {
  title:    { en: "SARA", ar: "سارة" },
  subtitle: { en: "Official Profile", ar: "الملف الرسمي" },
  tagline:  { en: "Official links and agency access.", ar: "روابط رسمية ووصول للوكالة." },
  image: "assets/profile-sara.jpg",
  initials: "S",
  showSharedAgencyLinks: true,
  applyEnabled: true,
  platforms: [
    { key: "youtube",   label: "YouTube",   url: "", enabled: false },
    { key: "tiktok",    label: "TikTok",    url: "", enabled: false },
    { key: "telegram",  label: "Telegram",  url: "", enabled: false },
    { key: "instagram", label: "Instagram", url: "", enabled: false },
    { key: "whatsapp",  label: "WhatsApp",  url: "", enabled: false },
    { key: "website",   label: "Website",   url: "", enabled: false }
  ]
}
```

2. Add the key to `profileOrder` so it shows on the selector page.
3. Its bio URL becomes `https://alwafer-link-hub.vercel.app/?profile=sara`.

---

## Local preview

```bash
python -m http.server 5173   # or:  npx serve .
```
Then open `http://localhost:5173/?profile=mustafa`.

---

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell — loads styles + scripts. |
| `styles.css` | Black/gold luxury theme (RTL-aware). |
| `config.js` | **All editable content** (bilingual names, links, toggles). |
| `app.js` | Renders the page + EN/AR toggle from `config.js`. |
| `assets/` | Profile images (see `assets/README.md`). |
| `vercel.json` | Serves the folder as a pure static site. |

---

## Deploy

Hosted as a static site on Vercel (AVENGERS scope). After editing:

```bash
git add .
git commit -m "Update content"
git push
```

Vercel redeploys automatically from the connected GitHub repo.

---

_Powered by ALWAFER Agency._
