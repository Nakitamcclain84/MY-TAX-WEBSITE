/* ===== SITE SETTINGS: change prices, classes, dates and links here ===== */
var SETTINGS = {
  portalUrl: "/portal/",
  bookingUrl: "{{BOOKING_URL}}",       // Google Calendar or other booking page (tax appointments)
  demoUrl: "{{BOOKING_URL}}",          // booking page for software demos
  intakeUrl: "{{INTAKE_URL}}",         // client intake form (documents, questions, signatures)
  newPreparerRetainer: 249,            // what a new PTIN Partner pays to join your team

  // Tax Academy sessions. Past classes hide automatically; the next one shows everywhere.
  trainings: [
    { title: "Form 1040 Fundamentals, Session 1", start: "2027-01-05T18:00:00-06:00", end: "2027-01-05T20:00:00-06:00", where: "Live online", price: 99 },
    { title: "Ethics, Circular 230 & Due Diligence", start: "2027-01-07T18:00:00-06:00", end: "2027-01-07T20:00:00-06:00", where: "Live online", price: 99 }
  ],
  timeZone: "America/Chicago",
  taxDay: "2027-04-15T23:59:59-05:00",
  extensionDeadline: "2026-10-15T23:59:59-05:00",

  // Prices. Optional sale: add { name: "sale", until: "YYYY-MM-DDT23:59:59-05:00", tag: "Sale price · ends Mon D" }
  // before "regular" and add sale: prices below.
  pricePhases: [ { name: "regular", until: null } ],
  prices: {
    ts:   { regular: 795,  direct: 1595 },
    olt:  { regular: 549,  direct: 849 },
    sb:   { regular: 1195 },
    sbc:  { regular: 1595 }
  },

  // Where each Buy button goes. Software goes to its agreement first, then payment.
  // Anything not listed opens the contact form with that package picked.
  buyLinks: {
    "TaxSlayer Pro Web": "/agreement-taxslayer.html",
    "OLT Pro Web": "/agreement-olt.html",
    "SmartWiz Add-On": "{{STRIPE_SMARTWIZ}}"
  }
};
