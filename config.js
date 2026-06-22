/* =====================================================================
 * config.js — ALWAFER Link Hub  (APPROVED FULL-PAGE ARTWORK / overlay)
 * ---------------------------------------------------------------------
 * Each profile route renders ONE approved 9:16 full-page artwork image
 * (941x1672), with transparent clickable hotspots overlaid exactly on
 * the visible buttons/chips drawn in the artwork.
 *
 * Hotspot coordinates below were MEASURED from the artwork pixels
 * (button bands + chip columns). All values are % of the artwork frame.
 * Open /?profile=<key>&hotspots=1 to see the zones outlined and fine-tune.
 * ===================================================================== */
(function () {
  "use strict";

  /* Active agency region links (open in a new tab). */
  var REGION_URLS = {
    MENA: "https://www.tiktok.com/t/ZMAN6Bu2W/",  // MENA = Middle East & North Africa (M-E-N-A)
    UK:   "https://www.tiktok.com/t/ZSxoyPd4W/",
    FR:   "https://www.tiktok.com/t/ZSxoAQrsm/",
    DE:   "https://www.tiktok.com/t/ZSQ1b63XY/",
    TR:   "https://www.tiktok.com/t/ZSxoUt6A7/",
    CCA:  "https://www.tiktok.com/t/ZSxECjfqx/"
  };

  /* Social URLs not provided yet => overlay present but non-navigating. */
  var PLATFORM_URLS = { youtube: "", tiktok: "", telegram: "", instagram: "", whatsapp: "" };
  var WEBSITE_URL = "";

  /* Apply button — placeholder until the real URL is provided. */
  var APPLY_LINK = "#apply-link-to-be-added";

  /* -------- shared geometry (same across all three artworks) -------- */
  var CHIP_H = 3.9;

  // Build the 13-hotspot map for a profile from its measured vertical layout.
  // L = { apply:[top,h], youtube:[top,h], ... website:[top,h], chipTop:Number }
  function buildOverlay(L) {
    var o = [];
    o.push({ key: "apply", kind: "apply", label: "Apply to Join the Agency",
             left: L.buttonLeft, width: L.buttonWidth, top: L.apply[0], height: L.apply[1] });
    [["youtube", "YouTube"], ["tiktok", "TikTok"], ["telegram", "Telegram"],
     ["instagram", "Instagram"], ["whatsapp", "WhatsApp"], ["website", "Website"]
    ].forEach(function (p) {
      var t = L[p[0]];
      o.push({ key: p[0], kind: "platform", label: p[1],
               left: L.buttonLeft, width: L.buttonWidth, top: t[0], height: t[1] });
    });
    ["MENA", "UK", "FR", "DE", "TR", "CCA"].forEach(function (r) {
      o.push({ key: r.toLowerCase(), kind: "region", region: r, label: r,
               left: L.chipLeft[r], width: L.chipWidth, top: L.chipTop, height: CHIP_H });
    });
    return o;
  }

  // Per-profile vertical layout, measured from each artwork (ALWAFER sits
  // ~2.5% higher than Ahmed/Hala because its header is shorter).
  var LAYOUT = {
    mustafa: { buttonLeft: 15.0, buttonWidth: 69.0, apply: [38.5, 5.7], youtube: [45.3, 5.1], tiktok: [51.3, 5.1], telegram: [57.1, 5.1],
               instagram: [63.0, 5.1], whatsapp: [68.9, 5.1], website: [74.8, 5.1], chipTop: 86.9, chipWidth: 10.6,
               chipLeft: { MENA: 13.5, UK: 25.7, FR: 38.2, DE: 50.6, TR: 63.0, CCA: 75.5 } },
    ahmed:   { buttonLeft: 14.5, buttonWidth: 70.4, apply: [41.0, 6.7], youtube: [48.4, 5.4], tiktok: [54.7, 5.4], telegram: [61.0, 5.4],
               instagram: [67.2, 5.4], whatsapp: [73.4, 5.4], website: [79.5, 5.4], chipTop: 90.6, chipWidth: 10.7,
               chipLeft: { MENA: 13.3, UK: 25.8, FR: 38.2, DE: 50.4, TR: 62.9, CCA: 75.2 } },
    hala:    { buttonLeft: 14.7, buttonWidth: 70.0, apply: [41.0, 6.7], youtube: [48.3, 5.4], tiktok: [54.7, 5.4], telegram: [61.0, 5.4],
               instagram: [67.2, 5.4], whatsapp: [73.4, 5.4], website: [79.8, 5.4], chipTop: 89.6, chipWidth: 10.8,
               chipLeft: { MENA: 13.1, UK: 25.5, FR: 38.0, DE: 50.5, TR: 63.1, CCA: 75.7 } }
  };

  var CONFIG = {
    brand: { en: "ALWAFER", ar: "وكالة الوافر" },
    applyLink: APPLY_LINK,
    regionUrls: REGION_URLS,
    platformUrls: PLATFORM_URLS,
    websiteUrl: WEBSITE_URL,
    profileOrder: ["mustafa", "ahmed", "hala"],

    profiles: {
      mustafa: {
        artwork:  "assets/page-alwafer.png",
        title:    { en: "ALWAFER",        ar: "وكالة الوافر" },
        subtitle: { en: "Alwafer Agency", ar: "وكالة الوافر الرسمية" },
        overlay:  buildOverlay(LAYOUT.mustafa)
      },
      ahmed: {
        artwork:  "assets/page-ahmed.png",
        title:    { en: "TEAM AHMED RAMADAN", ar: "فريق أحمد رمضان" },
        subtitle: { en: "Official Agency Network", ar: "شبكة الوكالة الرسمية" },
        overlay:  buildOverlay(LAYOUT.ahmed)
      },
      hala: {
        artwork:  "assets/page-hala.png",
        title:    { en: "HALA AL-SAGHIR", ar: "حلا الصغير" },
        subtitle: { en: "Official Profile", ar: "الملف الرسمي" },
        overlay:  buildOverlay(LAYOUT.hala)
      }
    }
  };

  var root = (typeof window !== "undefined") ? window
           : (typeof globalThis !== "undefined") ? globalThis : this;
  root.LINK_HUB_CONFIG = CONFIG;
  if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
})();
