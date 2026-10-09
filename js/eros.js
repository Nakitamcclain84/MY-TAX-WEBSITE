/* ERO team list. One entry per ERO.
   name  = must match the ERO's Name in Airtable EXACTLY (automations match on it).
   Team link for preparers: https://{{DOMAIN}}/team.html?ero=CODE */
window.EROS = [
  { code: "bprep", name: "{{BUSINESS_NAME}} ({{OWNER_NAME}})", bprep: true },
  { code: "mimis",
    name: "Sample Partner Tax Co (Sample Owner)",
    business: "Sample Partner Tax Co",
    owner: "Sample Owner",
    title: "Owner",
    phone: "(555) 555-0199",
    email: "partner@example.com",
    state: "Georgia",
    split: 70,
    retainer: 0,
    trainingPrice: 99 }
];
window.findEro = function(code){ code = (code || "").toLowerCase(); return (window.EROS || []).filter(function(x){ return x.code === code; })[0]; };
