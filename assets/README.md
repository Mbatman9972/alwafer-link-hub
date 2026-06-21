# assets/ — approved page artwork

The profile routes render ONE approved full-page artwork image each, with
transparent clickable hotspots overlaid on top. Drop the three approved images
here using these **exact** file names (already referenced by `config.js`):

| File | Route | Profile |
| --- | --- | --- |
| `page-alwafer.png` | `/?profile=mustafa` | ALWAFER |
| `page-ahmed.png` | `/?profile=ahmed` | Team Ahmed Ramadan |
| `page-hala.png` | `/?profile=hala` | Hala Al-Saghir |

Requirements:
- **9:16 portrait** images (the frame preserves that ratio and scales on mobile).
- PNG (or update the `artwork:` path in `config.js` if you use another extension).
- Keep each well-optimised (ideally < ~500 KB) for fast TikTok mobile loading.

After adding the files:

```bash
git add assets/
git commit -m "Add approved page artwork"
git push
```

Then tune the hotspot coordinates (see below) and deploy.

## Tuning the clickable hotspots

The clickable zones live in `config.js` -> `OVERLAY` as percentages of the frame.
Open any profile route with `?hotspots=1` to outline the zones, e.g.:

```
/?profile=mustafa&hotspots=1
```

Adjust each zone's `top` / `left` / `width` / `height` until the outline sits on
the matching button in the artwork. All three profiles share the same map.
