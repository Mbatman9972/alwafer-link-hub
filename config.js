/* =====================================================================
 * config.js — ALWAFER Link Hub  (APPROVED-ARTWORK / overlay mode)
 * ---------------------------------------------------------------------
 * Each profile route renders ONE approved 9:16 artwork image, with
 * transparent clickable hotspot anchors overlaid on top of it.
 *
 * To change content you only edit this file:
 *   - artwork image path per profile
 *   - region URLs / platform URLs / apply URL
 *   - the SHARED hotspot coordinate map (OVERLAY) — percentages
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

  /* Personal/platform URLs. Empty => the overlay stays present but is a
   * non-navigating placeholder (href="#", aria-disabled). Paste a real
   * URL to make that hotspot active. */
  var PLATFORM_URLS = {
    youtube:   "",
    tiktok:    "",
    telegram:  "",
    instagram: "",
    whatsapp:  ""
  };
  var WEBSITE_URL = "";

  /* Apply button — placeholder until the real URL is provided. */
  var APPLY_LINK = "#apply-link-to-be-added";

  /* -------------------------------------------------------------------
   * SHARED HOTSPOT MAP  (all three artworks share the same layout)
   * -------------------------------------------------------------------
   * Coordinates are PERCENTAGES of the artwork frame (which keeps the
   * 9:16 aspect ratio), so they scale on every screen size.
   *
   *   top/left/width/height are % of the frame.
   *
   * NOTE: these are reasonable starting positions for a top->bottom
   * vertical layout. They MUST be fine-tuned against the real approved
   * artwork (open any profile route with ?hotspots=1 to see the zones
   * outlined, then adjust the numbers below until they sit on the
   * buttons in the image).
   * ----------------------------------------------------------------- */
  var OVERLAY = [
    { key: "apply",     kind: "apply",    label: "Apply to Join the Agency", top: 41.0, left: 8,   width: 84,   height: 6 },

    { key: "youtube",   kind: "platform", label: "YouTube",   top: 49.0, left: 8, width: 84, height: 5 },
    { key: "tiktok",    kind: "platform", label: "TikTok",    top: 54.5, left: 8, width: 84, height: 5 },
    { key: "telegram",  kind: "platform", label: "Telegram",  top: 60.0, left: 8, width: 84, height: 5 },
    { key: "instagram", kind: "platform", label: "Instagram", top: 65.5, left: 8, width: 84, height: 5 },
    { key: "whatsapp",  kind: "platform", label: "WhatsApp",  top: 71.0, left: 8, width: 84, height: 5 },
    { key: "website",   kind: "platform", label: "Website",   top: 76.5, left: 8, width: 84, height: 5 },

    { key: "mena", kind: "region", region: "MENA", label: "MENA", top: 85, left: 6.0,  width: 13, height: 4 },
    { key: "uk",   kind: "region", region: "UK",   label: "UK",   top: 85, left: 21.5, width: 13, height: 4 },
    { key: "fr",   kind: "region", region: "FR",   label: "FR",   top: 85, left: 37.0, width: 13, height: 4 },
    { key: "de",   kind: "region", region: "DE",   label: "DE",   top: 85, left: 52.5, width: 13, height: 4 },
    { key: "tr",   kind: "region", region: "TR",   label: "TR",   top: 85, left: 68.0, width: 13, height: 4 },
    { key: "cca",  kind: "region", region: "CCA",  label: "CCA",  top: 85, left: 83.5, width: 13, height: 4 }
  ];

  var CONFIG = {
    brand: { en: "ALWAFER", ar: "وكالة الوافر" },

    applyLink: APPLY_LINK,
    regionUrls: REGION_URLS,
    platformUrls: PLATFORM_URLS,
    websiteUrl: WEBSITE_URL,
    overlay: OVERLAY,

    profileOrder: ["mustafa", "ahmed", "hala"],

    /* Profiles: artwork path + semantic (screen-reader) text only.
       The visible page IS the artwork; this text is visually hidden. */
    profiles: {
      mustafa: {
        artwork:  "assets/page-alwafer.png",
        title:    { en: "ALWAFER",        ar: "وكالة الوافر" },
        subtitle: { en: "Alwafer Agency", ar: "وكالة الوافر الرسمية" }
      },
      ahmed: {
        artwork:  "assets/page-ahmed.png",
        title:    { en: "TEAM AHMED RAMADAN", ar: "فريق أحمد رمضان" },
        subtitle: { en: "Official Agency Network", ar: "شبكة الوكالة الرسمية" }
      },
      hala: {
        artwork:  "assets/page-hala.png",
        title:    { en: "HALA AL-SAGHIR", ar: "حلا الصغير" },
        subtitle: { en: "Official Profile", ar: "الملف الرسمي" }
      }
    }
  };

  var root = (typeof window !== "undefined") ? window
           : (typeof globalThis !== "undefined") ? globalThis : this;
  root.LINK_HUB_CONFIG = CONFIG;
  if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
})();
