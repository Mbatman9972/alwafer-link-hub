/* =====================================================================
 * config.js — ALWAFER Link Hub
 * ---------------------------------------------------------------------
 * THE ONLY FILE YOU NEED TO EDIT TO CHANGE CONTENT.
 * Names, taglines, photos, links, region links, and on/off toggles
 * all live here. Bilingual (English + Arabic). See README.md.
 * ===================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------
   * SHARED AGENCY REGION LINKS  (chips shown on every profile)
   * The first region label is "MENA" — Middle East & North Africa,
   * spelled M-E-N-A (do not misspell it).
   * --------------------------------------------------------------- */
  var SHARED_AGENCY_LINKS = [
    { region: "MENA", url: "https://www.tiktok.com/t/ZMAN6Bu2W/", enabled: true },
    { region: "UK",   url: "https://www.tiktok.com/t/ZSxoyPd4W/", enabled: true },
    { region: "FR",   url: "https://www.tiktok.com/t/ZSxoAQrsm/", enabled: true },
    { region: "DE",   url: "https://www.tiktok.com/t/ZSQ1b63XY/", enabled: true },
    { region: "TR",   url: "https://www.tiktok.com/t/ZSxoUt6A7/", enabled: true },
    { region: "CCA",  url: "https://www.tiktok.com/t/ZSxECjfqx/", enabled: true }
  ];

  /* ---------------------------------------------------------------
   * APPLY / JOIN THE AGENCY button URL.
   * Replace the placeholder when the real application link is ready.
   * (While it is a "#..." placeholder the button shows but does not
   *  navigate, so visitors never hit a broken link.)
   * --------------------------------------------------------------- */
  var APPLY_LINK = "#apply-link-to-be-added";

  /* ---------------------------------------------------------------
   * PLATFORM SLOTS (per profile).
   * These ALWAYS show as buttons (this is where the links will live).
   * A slot only becomes a real, tappable link once you paste a "url"
   * AND set "enabled: true". Until then it shows as a disabled slot.
   * --------------------------------------------------------------- */
  function platformSlots() {
    return [
      { key: "youtube",   label: "YouTube",   url: "", enabled: false },
      { key: "tiktok",    label: "TikTok",    url: "", enabled: false },
      { key: "telegram",  label: "Telegram",  url: "", enabled: false },
      { key: "instagram", label: "Instagram", url: "", enabled: false },
      { key: "whatsapp",  label: "WhatsApp",  url: "", enabled: false },
      { key: "website",   label: "Website",   url: "", enabled: false }
    ];
  }

  var CONFIG = {
    /* Brand identity */
    brand: {
      en: "ALWAFER",
      ar: "وكالة الوافر"
    },

    /* Default language shown on first visit ("en" or "ar") */
    defaultLang: "en",

    /* Apply button */
    applyLink: APPLY_LINK,

    /* Shared region links reused by every profile */
    sharedAgencyLinks: SHARED_AGENCY_LINKS,

    /* Order of cards on the selector page */
    profileOrder: ["mustafa", "ahmed", "hala"],

    /* ---------------------------------------------------------------
     * UI STRINGS (English + Arabic)
     * --------------------------------------------------------------- */
    ui: {
      en: {
        langName: "EN",
        apply: "Apply to Join the Agency",
        platformsHeading: "Links",
        regionsHeading: "Agency Regions",
        websiteLabel: "Website",
        comingSoon: "Soon",
        allProfiles: "All profiles",
        selectorSubtitle: "Choose a profile",
        footer: "Powered by ALWAFER Agency"
      },
      ar: {
        langName: "العربية",
        apply: "تقدّم للانضمام إلى الوكالة",
        platformsHeading: "الروابط",
        regionsHeading: "مناطق الوكالة",
        websiteLabel: "الموقع الإلكتروني",
        comingSoon: "قريباً",
        allProfiles: "كل الملفات",
        selectorSubtitle: "اختر ملفاً",
        footer: "بدعم من وكالة الوافر"
      }
    },

    /* ---------------------------------------------------------------
     * PROFILES
     * URL key (mustafa / ahmed / hala) stays the same; the DISPLAYED
     * name is taken from title/subtitle/tagline below.
     * --------------------------------------------------------------- */
    profiles: {
      /* Brand page — route stays ?profile=mustafa, but shows ALWAFER.
         "Mustafa" is never displayed. */
      mustafa: {
        brandPage: true,
        title:    { en: "ALWAFER",        ar: "وكالة الوافر" },
        subtitle: { en: "Alwafer Agency", ar: "وكالة الوافر الرسمية" },
        tagline:  { en: "Official links, channels, and agency access.",
                    ar: "روابط وقنوات الوكالة الرسمية وإمكانية الوصول." },
        image: "assets/profile-alwafer.png",   // drop the ALWAFER logo here
        initials: "A",
        showSharedAgencyLinks: true,
        applyEnabled: true,
        platforms: platformSlots()
      },

      ahmed: {
        title:    { en: "TEAM AHMED RAMADAN", ar: "فريق أحمد رمضان" },
        subtitle: { en: "Official Agency Network", ar: "شبكة الوكالة الرسمية" },
        tagline:  { en: "Official regional agency links and joining access.",
                    ar: "روابط الوكالة الإقليمية الرسمية وإمكانية الانضمام." },
        image: "assets/profile-ahmed.jpg",     // drop Ahmed's photo here
        initials: "AR",
        showSharedAgencyLinks: true,
        applyEnabled: true,
        platforms: platformSlots()
      },

      hala: {
        title:    { en: "HALA AL-SAGHIR", ar: "حلا الصغير" },
        subtitle: { en: "Official Profile", ar: "الملف الرسمي" },
        tagline:  { en: "Official social links, channels, and agency access.",
                    ar: "روابط التواصل الاجتماعي والقنوات الرسمية وإمكانية الوصول للوكالة." },
        image: "assets/profile-hala.jpg",      // drop Hala's photo here
        initials: "HS",
        showSharedAgencyLinks: true,
        applyEnabled: true,
        platforms: platformSlots()
      }
    }
  };

  /* Export — browser (window) + Node (tests) */
  var root = (typeof window !== "undefined") ? window
           : (typeof globalThis !== "undefined") ? globalThis
           : this;
  root.LINK_HUB_CONFIG = CONFIG;
  if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
})();
