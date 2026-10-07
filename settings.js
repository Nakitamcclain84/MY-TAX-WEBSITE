/* ===== SITE SETTINGS: change prices, classes, dates and links here ===== */
var SETTINGS = {
  portalUrl: "/portal/",
  bookingUrl: "{{BOOKING_URL}}",       // Google Calendar or other booking page (tax appointments)
  demoUrl: "{{BOOKING_URL}}",          // booking page for software demos
  intakeUrl: "{{INTAKE_URL}}",         // client intake form (documents, questions, signatures)
  newPreparerRetainer: 249,            // what a new PTIN Partner pays to join your team

  // Tax Academy sessions. Past classes hide automatically; the next one shows everywhere.
  trainings: [
    { title: "Form 1040 Fundamentals, Session 1", start: "2026-09-29T18:00:00-05:00", end: "2026-09-29T20:00:00-05:00", where: "Live online via TaxPrepBootcamp", price: 99 },
    { title: "Form 1040 Fundamentals, Session 2", start: "2026-10-01T18:00:00-05:00", end: "2026-10-01T20:00:00-05:00", where: "Live online via TaxPrepBootcamp", price: 99 },
    { title: "Tax Preparer Ethics, Circular 230 & Due Diligence, Session 1", start: "2026-10-06T18:00:00-05:00", end: "2026-10-06T20:00:00-05:00", where: "Live online via TaxPrepBootcamp", price: 99 },
    { title: "Tax Preparer Ethics, Circular 230 & Due Diligence, Session 2", start: "2026-10-08T18:00:00-05:00", end: "2026-10-08T20:00:00-05:00", where: "Live online via TaxPrepBootcamp", price: 99 }
  ],
  timeZone: "America/New_York",   // times show in Eastern, with Central, Mountain and Pacific
  taxDay: "2027-04-15T23:59:59-05:00",
  extensionDeadline: "2026-10-15T23:59:59-05:00",

  // Prices. Optional sale: add { name: "sale", until: "YYYY-MM-DDT23:59:59-05:00", tag: "Sale price · ends Mon D" }
  // before "regular" and add sale: prices below.
  pricePhases: [ { name: "regular", until: null } ],
  prices: {
    ts:   { regular: 597,  direct: 1595 },
    olt:  { regular: 549,  direct: 849 },
    sb:   { regular: 1195 },
    sbc:  { regular: 1595 }
  },

  // Where each Buy button goes. Software goes to its agreement first, then payment.
  // Anything not listed opens the contact form with that package picked.
  buyLinks: {
    "TaxSlayer Pro Web": "/agreement-taxslayer.html",
    "OLT Pro Web": "/agreement-olt.html"
  }
};
