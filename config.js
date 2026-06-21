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
  var BTN_LEFT = 7.5, BTN_WIDTH = 85;            // full-width buttons
  var CHIP_W = 11.2, CHIP_H = 3.8;               // region chips
  var CHIP_LEFT = { MENA: 12.6, UK: 25.2, FR: 37.8, DE: 50.2, TR: 62.8, CCA: 75.4 };

  // Build the 13-hotspot map for a profile from its measured vertical layout.
  // L = { apply:[top,h], youtube:[top,h], ... website:[top,h], chipTop:Number }
  function buildOverlay(L) {
    var o = [];
    o.push({ key: "apply", kind: "apply", label: "Apply to Join the Agency",
             left: BTN_LEFT, width: BTN_WIDTH, top: L.apply[0], height: L.apply[1] });
    [["youtube", "YouTube"], ["tiktok", "TikTok"], ["telegram", "Telegram"],
     ["instagram", "Instagram"], ["whatsapp", "WhatsApp"], ["website", "Website"]
    ].forEach(function (p) {
      var t = L[p[0]];
      o.push({ key: p[0], kind: "platform", label: p[1],
               left: BTN_LEFT, width: BTN_WIDTH, top: t[0], height: t[1] });
    });
    ["MENA", "UK", "FR", "DE", "TR", "CCA"].forEach(function (r) {
      o.push({ key: r.toLowerCase(), kind: "region", region: r, label: r,
               left: CHIP_LEFT[r], width: CHIP_W, top: L.chipTop, height: CHIP_H });
    });
    return o;
  }

  // Per-profile vertical layout, measured from each artwork (ALWAFER sits
  // ~2.5% higher than Ahmed/Hala because its header is shorter).
  var LAYOUT = {
    mustafa: { apply: [37.4, 6.4], youtube: [44.3, 5.4], tiktok: [50.4, 5.4], telegram: [56.2, 5.4],
               instagram: [62.2, 5.4], whatsapp: [68.2, 5.4], website: [74.0, 5.7], chipTop: 86.9 },
    ahmed:   { apply: [39.8, 6.7], youtube: [47.6, 5.4], tiktok: [54.0, 5.4], telegram: [60.1, 5.4],
               instagram: [66.3, 5.4], whatsapp: [72.4, 5.4], website: [78.6, 5.7], chipTop: 90.6 },
    hala:    { apply: [39.9, 6.7], youtube: [47.6, 5.4], tiktok: [54.0, 5.4], telegram: [60.1, 5.4],
               instagram: [66.4, 5.4], whatsapp: [72.6, 5.4], website: [79.0, 5.7], chipTop: 89.6 }
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
