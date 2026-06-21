# assets/ — profile images

Drop the three approved images here using these **exact** file names. `config.js`
already points to them, so no code changes are needed once they exist:

| File | Used by | Route |
| --- | --- | --- |
| `profile-alwafer.png` | ALWAFER brand page | `/?profile=mustafa` |
| `profile-ahmed.jpg` | Team Ahmed Ramadan | `/?profile=ahmed` |
| `profile-hala.jpg` | Hala Al-Saghir | `/?profile=hala` |

Notes:
- If you prefer a different extension (e.g. `.png` instead of `.jpg`), update the
  matching `image:` path in `config.js`.
- Until a file is present, the page shows a premium glowing gold **monogram**
  (A / AR / HS) as a graceful fallback — it is **not** a broken image.
- Recommended: square images, ~600×600px or larger, under ~300 KB for fast loading
  on mobile / TikTok traffic.

After adding the files:

```bash
git add assets/
git commit -m "Add profile images"
git push
```

Vercel redeploys automatically and the real photos appear.
