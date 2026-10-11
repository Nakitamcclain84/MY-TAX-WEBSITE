/* ===== SITE SETTINGS: change prices, classes, dates and links here ===== */
var SETTINGS = {
  portalUrl: "/portal/",
  bookingUrl: "{{BOOKING_URL}}",       // Google Calendar or other booking page (tax appointments)
  demoUrl: "{{BOOKING_URL}}",          // booking page for software demos
  intakeUrl: "{{INTAKE_URL}}",         // client intake form (documents, questions, signatures)
  newPreparerRetainer: 249,            // what a new PTIN Partner pays to join your team

  // Tax Academy sessions. Past classes hide automatically; the next one shows everywhere.
  trainings: [
    { title: "Tax Preparer Ethics, Circular 230 & Due Diligence", start: "2026-10-13T19:00:00-04:00", end: "2026-10-13T21:00:00-04:00", where: "Live online via TaxPrepBootcamp", price: 99 },
    { title: "Schedule C Reconstruction, Part 1 of 2", start: "2026-10-15T19:00:00-04:00", end: "2026-10-15T21:00:00-04:00", where: "Live online via TaxPrepBootcamp", price: 99 },
    { title: "Schedule C Reconstruction, Part 2 of 2", start: "2026-10-20T19:00:00-04:00", end: "2026-10-20T21:00:00-04:00", where: "Live online via TaxPrepBootcamp", price: 99 },
    { title: "Amending Individual Returns: Form 1040-X", start: "2026-10-22T19:00:00-04:00", end: "2026-10-22T21:00:00-04:00", where: "Live online via TaxPrepBootcamp", price: 99 },
    { title: "Filing Extensions & Estimated Tax Payments", start: "2026-10-27T19:00:00-04:00", end: "2026-10-27T20:00:00-04:00", where: "Live online via TaxPrepBootcamp", price: 99 }
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
    "OLT Pro Web": "/agreement-olt.html"
  }
};
