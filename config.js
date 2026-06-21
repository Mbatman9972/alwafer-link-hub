/* =====================================================================
 * config.js — Alwafir Link Hub
 * ---------------------------------------------------------------------
 * THIS IS THE ONLY FILE YOU NEED TO EDIT TO CHANGE CONTENT.
 * Names, handles, bios, photos, links, and on/off toggles all live here.
 * (See README.md for step-by-step instructions.)
 * ===================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------
   * SHARED AGENCY LINKS
   * Shown on every profile that has  showSharedAgencyLinks: true
   * To add/remove a region, edit this list. "label" is the button
   * text the visitor sees; "url" is where it goes.
   * NOTE: the first region label is "MENA" — Middle East & North Africa,
   *       spelled M-E-N-A (do not misspell it).
   * --------------------------------------------------------------- */
  var SHARED_AGENCY_LINKS = [
    { region: "MENA", label: "MENA", url: "https://www.tiktok.com/t/ZMAN6Bu2W/", enabled: true },
    { region: "UK",   label: "UK",   url: "https://www.tiktok.com/t/ZSxoyPd4W/", enabled: true },
    { region: "FR",   label: "FR",   url: "https://www.tiktok.com/t/ZSxoAQrsm/", enabled: true },
    { region: "DE",   label: "DE",   url: "https://www.tiktok.com/t/ZSQ1b63XY/", enabled: true },
    { region: "TR",   label: "TR",   url: "https://www.tiktok.com/t/ZSxoUt6A7/", enabled: true },
    { region: "CCA",  label: "CCA",  url: "https://www.tiktok.com/t/ZSxECjfqx/", enabled: true }
  ];

  /* ---------------------------------------------------------------
   * APPLY / JOIN THE AGENCY BUTTON
   * Replace the placeholder below with the real application URL when
   * it is ready (e.g. "https://forms.gle/....").
   * --------------------------------------------------------------- */
  var APPLY_LINK = "#apply-link-to-be-added";

  /* ---------------------------------------------------------------
   * PERSONAL LINK PLACEHOLDERS (per profile)
   * Each of these is OFF (enabled:false) and will NOT appear on the
   * page until you paste a real "url" AND set "enabled: true".
   * --------------------------------------------------------------- */
  function personalLinkPlaceholders() {
    return [
      { key: "youtube",   label: "YouTube",   url: "", enabled: false },
      { key: "tiktok",    label: "TikTok",    url: "", enabled: false },
      { key: "telegram",  label: "Telegram",  url: "", enabled: false },
      { key: "instagram", label: "Instagram", url: "", enabled: false },
      { key: "whatsapp",  label: "WhatsApp",  url: "", enabled: false },
      { key: "website",   label: "Website",   url: "", enabled: false }
    ];
  }

  /* ---------------------------------------------------------------
   * THE CONFIG OBJECT
   * --------------------------------------------------------------- */
  var CONFIG = {
    brand: {
      name: "Alwafir Agency",
      footer: "Powered by Alwafir Agency"
    },

    // Apply button
    applyLink: APPLY_LINK,
    applyButtonLabel: "Apply to Join the Agency",

    // Section headings
    agencyLinksHeading: "Agency Channels",
    personalLinksHeading: "Links",

    // Selector page copy
    selectorTitle: "Alwafir Agency",
    selectorSubtitle: "Choose a profile",

    // Shared agency links (same list reused by every profile)
    sharedAgencyLinks: SHARED_AGENCY_LINKS,

    // Order the cards appear in on the selector page
    profileOrder: ["mustafa", "ahmed", "hala"],

    /* -------------------------------------------------------------
     * PROFILES
     * Each key (mustafa / ahmed / hala) is the value used in the URL,
     * e.g.  /?profile=mustafa   or   /#mustafa
     * ----------------------------------------------------------- */
    profiles: {
      mustafa: {
        displayName: "Mustafa",
        handle: "@alwafer",
        initials: "M",
        accentLabel: "Alwafir",
        bio: "Official links, channels, and agency access.",
        image: "",                              // paste a photo URL/path; empty => initials shown
        showSharedAgencyLinks: true,
        applyEnabled: true,
        personalLinks: personalLinkPlaceholders(),
        customLinks: []                         // add { label, url, enabled: true } here
      },

      ahmed: {
        displayName: "Team Ahmed Ramadan",
        handle: "Agency Network",
        initials: "AR",
        accentLabel: "Official Agency Network",
        bio: "Official regional agency links and joining access.",
        image: "",
        showSharedAgencyLinks: true,
        applyEnabled: true,
        personalLinks: personalLinkPlaceholders(),
        customLinks: []
      },

      hala: {
        displayName: "Hala Al-Saghir",
        handle: "Official Links",
        initials: "HS",
        accentLabel: "Official Profile",
        bio: "Official social links, channels, and agency access.",
        image: "",
        showSharedAgencyLinks: true,
        applyEnabled: true,
        personalLinks: personalLinkPlaceholders(),
        customLinks: []
      }
    }
  };

  /* ---------------------------------------------------------------
   * EXPORT — works in the browser (window) and in Node (tests).
   * --------------------------------------------------------------- */
  var root = (typeof window !== "undefined") ? window
           : (typeof globalThis !== "undefined") ? globalThis
           : this;
  root.LINK_HUB_CONFIG = CONFIG;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CONFIG;
  }
})();
