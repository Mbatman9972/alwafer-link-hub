# Alwafir Link Hub

A fast, static, mobile-first "link hub" (Linktree-style **function**, original design) for
TikTok bios. Three profiles, shared agency links, and an "Apply to Join the Agency" button —
all controlled from a single file: **`config.js`**.

- **No backend, no database, no CMS, no build step.**
- Plain HTML + CSS + JavaScript.
- Works great on TikTok mobile traffic.

---

## Profiles & URLs

| Person | URL to put in the TikTok bio |
| --- | --- |
| **Mustafa** | `https://YOUR-DOMAIN/?profile=mustafa` |
| **Team Ahmed Ramadan** | `https://YOUR-DOMAIN/?profile=ahmed` |
| **Hala Al-Saghir** | `https://YOUR-DOMAIN/?profile=hala` |

> Replace `YOUR-DOMAIN` with the production URL printed at deploy time.
> The hash form also works: `…/#mustafa`, `…/#ahmed`, `…/#hala`.
> Visiting the site with **no** profile shows a selector page with all three.

---

## Editing content — everything is in `config.js`

Open **`config.js`** in any text editor. You never need to touch the other files.

### Change a name, handle, or bio
Find the profile (`mustafa`, `ahmed`, or `hala`) and edit the text in quotes:

```js
mustafa: {
  displayName: "Mustafa",                         // the big name
  handle: "@alwafer",                             // the small handle under it
  bio: "Official links, channels, and agency access.",
  ...
}
```

### Change a profile photo
Set the `image` field to a photo URL (or a file path you add to this folder):

```js
image: "https://example.com/mustafa.jpg",
```

- Leave it as `""` (empty) to show the **initials fallback** instead.
- Change the initials with the `initials` field (e.g. `"M"`, `"AR"`, `"HS"`).
- If the image URL is broken, the page automatically falls back to initials.

### Turn a personal link ON
Each profile ships with placeholders for **YouTube, TikTok, Telegram, Instagram, WhatsApp,
Website** — all **disabled** so they do **not** appear yet. To switch one on, paste the real
URL and set `enabled: true`:

```js
{ key: "youtube", label: "YouTube", url: "https://youtube.com/@you", enabled: true },
```

### Turn any link OFF
Set `enabled: false`. Disabled links never render.

### Add a custom link
Add an item to a profile's `customLinks` list:

```js
customLinks: [
  { label: "My Latest Video", url: "https://...", enabled: true }
]
```

### Change the "Apply to Join the Agency" button URL
Near the top of `config.js`, replace the placeholder:

```js
var APPLY_LINK = "#apply-link-to-be-added";   // <- put the real apply URL here
```

To hide the Apply button for a single profile, set `applyEnabled: false` on that profile.

### Edit the shared agency links
The six regional links appear on every profile. Edit them once near the top of `config.js`:

```js
var SHARED_AGENCY_LINKS = [
  { region: "MENA", label: "MENA", url: "https://www.tiktok.com/t/ZMAN6Bu2W/", enabled: true },
  { region: "UK",   label: "UK",   url: "https://www.tiktok.com/t/ZSxoyPd4W/", enabled: true },
  ...
];
```

> The first region label is **MENA** — Middle East & North Africa, spelled M-E-N-A.
> To hide all agency links for one profile, set `showSharedAgencyLinks: false` on it.

---

## Add a fourth profile

1. In `config.js`, add a new key inside `profiles` (the key is what goes in the URL):

```js
profiles: {
  mustafa: { ... },
  ahmed:   { ... },
  hala:    { ... },
  sara: {                                  // <- new
    displayName: "Sara",
    handle: "Official Links",
    initials: "S",
    accentLabel: "Official Profile",
    bio: "Official social links and agency access.",
    image: "",
    showSharedAgencyLinks: true,
    applyEnabled: true,
    personalLinks: [
      { key: "youtube",   label: "YouTube",   url: "", enabled: false },
      { key: "tiktok",    label: "TikTok",    url: "", enabled: false },
      { key: "telegram",  label: "Telegram",  url: "", enabled: false },
      { key: "instagram", label: "Instagram", url: "", enabled: false },
      { key: "whatsapp",  label: "WhatsApp",  url: "", enabled: false },
      { key: "website",   label: "Website",   url: "", enabled: false }
    ],
    customLinks: []
  }
}
```

2. Add the new key to `profileOrder` so it shows on the selector page:

```js
profileOrder: ["mustafa", "ahmed", "hala", "sara"],
```

3. Its bio URL becomes `https://YOUR-DOMAIN/?profile=sara`.

That's it — no other file changes are needed.

---

## Local preview

It's a static site, so any of these work from this folder:

```bash
# Python
python -m http.server 5173
# or Node
npx serve .
```

Then open `http://localhost:5173/?profile=mustafa`.

> Opening `index.html` directly via `file://` works too, but using a local server is closer
> to production.

---

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell — loads the styles and scripts. |
| `styles.css` | All styling (dark luxury theme). |
| `config.js` | **All editable content** (names, links, toggles). |
| `app.js` | Renders the page from `config.js`. |
| `vercel.json` | Tells Vercel to serve the folder as a pure static site. |
| `README.md` | This file. |

---

## Deploy

Hosted as a static site on Vercel. To redeploy after editing `config.js`:

```bash
git add .
git commit -m "Update links"
git push
```

Vercel redeploys automatically from the connected GitHub repo. (Or run `vercel --prod` from
this folder.)

---

_Powered by Alwafir Agency._
