// All portal pages beyond Home read and write through here.
// Who you are comes only from the signed cookie (s.p = your preparer record, s.r = your ERO record).
// Every read is filtered to those IDs, and every write re-checks ownership before changing anything.
import {
  json, configured, readSession, readJsonPost, listRecords, getRecord, createRecord, updateRecord,
  cleanEmail, num, selName, files, owns, viewAs, T, F,
} from "../lib/core.mjs";

const PREP_STATUSES = ["In Progress", "Filed", "Accepted", "Rejected", "Funded"];
const SEASONS = ["2027", "2026"];
const FOLLOW = ["Not contacted", "Contacted", "Booked", "Filed this season", "Not returning"];
const has = (field, id) => `FIND('${id}', {${field}})`;
const clip = (s, n) => String(s == null ? "" : s).trim().slice(0, n);

const fail = (message, status = 400) => json({ ok: false, message }, status);

export default async (req) => {
  if (!configured()) return fail("The portal isn't set up yet.", 503);
  const real = readSession(req);
  if (!real) return json({ ok: false, signedOut: true }, 401);
  const route = new URL(req.url).pathname.replace(/^\/api\/portal\//, "");
  const isPost = req.method === "POST";
  if (route === "whoami") return json({ ok: true, name: real.n, email: real.e, roles: { preparer: Boolean(real.p), ero: Boolean(real.r), admin: Boolean(real.a) } });
  const v = viewAs(req, real), s = v.s;
  // Admins viewing an ERO's portal may still check off onboarding steps (they can do this from the Admin Dashboard too).
  if (v.viewing && isPost && route !== "ero/application") return fail("You're viewing someone else's portal. Changes are turned off here.", 403);
  if (route.startsWith("admin")) {
    if (!real.a) return fail("Admins only.", 403);
    return admin(route, req, isPost).catch((err) => { console.error("admin", err.message); return fail("Something went wrong. Please try again in a minute.", 500); });
  }
  try {
    if (route === "resources") {
      const rows = await listRecords("Portal Links", {
        fields: ["Title", "Link", "Details", "Order", "Section"],
        sort: [{ field: "Order", direction: "asc" }], max: 300,
      });
      return json({ ok: true, items: rows.map((r) => ({
        title: r.fields["Title"] || "", link: r.fields["Link"] || "", details: r.fields["Details"] || "",
        section: selName(r.fields["Section"]) || "More",
      })) });
    }
    // ---------------- Preparer ----------------
    if (route === "returns" || route === "corrections" || route === "agreement" || route === "past-clients") {
      if (!s.p) return fail("This page is for preparers.", 403);
    }
    if (route.startsWith("ero")) {
      if (!s.r) return fail("This page is for EROs.", 403);
    }

    if (route === "returns" && !isPost) {
      const rows = await listRecords(T.returns, {
        formula: has("Preparer Record ID", s.p),
        fields: [F.rRef, F.rDate, F.rStatus, F.rFee, F.rShare, F.rPending, F.rVerified, F.rBank, F.rSeason, F.rClientFirst, F.rClientEmail, F.rPrepRid],
        sort: [{ field: "Date Filed", direction: "desc" }], max: 3000,
      });
      return json({
        ok: true,
        returns: rows.filter((r) => owns(r.fields[F.rPrepRid], s.p)).map((r) => ({
          id: r.id, ref: r.fields[F.rRef] || "", date: r.fields[F.rDate] || "", status: selName(r.fields[F.rStatus]) || "In Progress",
          fee: num(r.fields[F.rFee]), share: num(r.fields[F.rShare]), pendingShare: num(r.fields[F.rPending]),
          verified: Boolean(r.fields[F.rVerified]), bank: Boolean(r.fields[F.rBank]), season: selName(r.fields[F.rSeason]),
          clientFirst: r.fields[F.rClientFirst] || "", clientEmail: r.fields[F.rClientEmail] || "",
        })),
      });
    }

    if (route === "returns" && isPost) {
      const b = await readJsonPost(req);
      if (!b) return fail("Bad request.");
      const ref = clip(b.ref, 24);
      if (!ref) return fail("Enter a client reference (initials or an ID, never a full name).");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || "")) return fail("Enter the date filed.");
      if (!PREP_STATUSES.includes(b.status)) return fail("Choose a status.");
      const fee = Number(b.fee);
      if (!(fee >= 0 && fee <= 10000)) return fail("Enter a prep fee between $0 and $10,000.");
      const season = SEASONS.includes(String(b.season)) ? String(b.season) : "2027";
      let email = "";
      if (b.clientEmail) { email = cleanEmail(b.clientEmail); if (!email) return fail("The client email doesn't look right."); }
      const fields = {
        [F.rRef]: ref, [F.rDate]: b.date, [F.rStatus]: b.status, [F.rFee]: Math.round(fee * 100) / 100,
        [F.rBank]: Boolean(b.bank), [F.rSeason]: season, [F.rClientFirst]: clip(b.clientFirst, 30), [F.rClientEmail]: email || null,
      };
      if (b.id) {
        const cur = await getRecord(T.returns, String(b.id));
        if (!owns(cur.fields[F.rPrepRid], s.p)) return fail("You can only change your own returns.", 403);
        if (cur.fields[F.rVerified]) return fail("This return is already verified by {{SHORT_NAME}}. Send a correction request instead.", 409);
        await updateRecord(T.returns, cur.id, fields);
        return json({ ok: true, message: "Return updated." });
      }
      fields[F.rPrep] = [s.p];
      const rec = await createRecord(T.returns, fields);
      return json({ ok: true, id: rec.id, message: "Return logged." });
    }

    if (route === "corrections" && !isPost) {
      const rows = await listRecords(T.corrections, {
        formula: has("Preparer Record ID", s.p),
        fields: [F.cRef, F.cWhat, F.cStatus, F.cNotes, F.cPrepRid], max: 500,
      });
      return json({
        ok: true,
        corrections: rows.filter((r) => owns(r.fields[F.cPrepRid], s.p)).reverse().map((r) => ({
          ref: r.fields[F.cRef] || "", what: r.fields[F.cWhat] || "", status: selName(r.fields[F.cStatus]) || "New",
          notes: r.fields[F.cNotes] || "", created: r.createdTime,
        })),
      });
    }

    if (route === "corrections" && isPost) {
      const b = await readJsonPost(req);
      const ref = clip(b && b.ref, 24), what = clip(b && b.what, 2000);
      if (!ref || !what) return fail("Enter the client reference and what needs fixing.");
      const prep = await getRecord(T.preparers, s.p);
      await createRecord(T.corrections, {
        [F.cRef]: ref, [F.cWhat]: what, [F.cBy]: prep.fields[F.pName] || s.n, [F.cEmail]: s.e, [F.cPrep]: [s.p], [F.cStatus]: "New",
      });
      return json({ ok: true, message: "Sent! {{SHORT_NAME}} will review it and update the status here." });
    }

    if (route === "agreement") {
      const prep = await getRecord(T.preparers, s.p);
      const rows = await listRecords(T.agreements, {
        formula: `AND(${has("Preparer Record ID", s.p)}, {Approved})`,
        fields: [F.aType, F.aSignedAt, F.aFinal, F.aPrepRid], max: 20,
      });
      const docs = files(prep.fields[F.pAgreementFile]).map((f) => ({ ...f, label: "Signed agreement" }));
      rows.filter((r) => owns(r.fields[F.aPrepRid], s.p)).forEach((r) => {
        files(r.fields[F.aFinal]).forEach((f) => docs.push({ ...f, label: selName(r.fields[F.aType]) || "Agreement", signedAt: r.fields[F.aSignedAt] || "" }));
      });
      const seen = new Set();
      return json({ ok: true, docs: docs.filter((d) => !seen.has(d.url) && seen.add(d.url)) });
    }

    if (route === "past-clients" && !isPost) {
      const rows = await listRecords(T.pastClients, {
        formula: has("Preparer Record ID", s.p),
        fields: [F.pcName, F.pcPhone, F.pcEmail, F.pcYear, F.pcFiling, F.pcFee, F.pcFollow, F.pcNotes, F.pcPrepRid],
        sort: [{ field: "Client Name", direction: "asc" }], max: 3000,
      });
      return json({
        ok: true, followOptions: FOLLOW,
        clients: rows.filter((r) => owns(r.fields[F.pcPrepRid], s.p)).map((r) => ({
          id: r.id, name: r.fields[F.pcName] || "", phone: r.fields[F.pcPhone] || "", email: r.fields[F.pcEmail] || "",
          year: selName(r.fields[F.pcYear]), filing: selName(r.fields[F.pcFiling]), fee: num(r.fields[F.pcFee]),
          follow: selName(r.fields[F.pcFollow]) || "Not contacted", notes: r.fields[F.pcNotes] || "",
        })),
      });
    }

    if (route === "past-clients" && isPost) {
      const b = await readJsonPost(req);
      if (!b || !b.id || !FOLLOW.includes(b.follow)) return fail("Bad request.");
      const cur = await getRecord(T.pastClients, String(b.id));
      if (!owns(cur.fields[F.pcPrepRid], s.p)) return fail("You can only update your own clients.", 403);
      const fields = { [F.pcFollow]: b.follow };
      if (typeof b.notes === "string") fields[F.pcNotes] = clip(b.notes, 2000);
      await updateRecord(T.pastClients, cur.id, fields);
      return json({ ok: true });
    }

    // ---------------- ERO ----------------
    if (route === "ero" && !isPost) {
      const ero = await getRecord(T.eros, s.r);
      const e = ero.fields;
      const [preps, rets, apps, tix] = await Promise.all([
        listRecords(T.preparers, {
          formula: has("ERO Record ID", s.r),
          fields: [F.pName, F.pEmail, F.pPhone, F.pStatus, F.pFunded, F.pTotal, F.pEarned, F.pSplit, F.pEroSplit, F.pRetainerDue, F.pRetainerPaid, F.pNew, F.pPtin, F.pOwner, F.pFundedBank, F.pEroRid],
          max: 500,
        }),
        listRecords(T.returns, {
          formula: has("ERO Record ID", s.r),
          fields: [F.rRef, F.rDate, F.rStatus, F.rFee, F.rEroShare, F.rVerified, F.rBank, F.rPrep, F.rEroRid, F.rSeason],
          sort: [{ field: "Date Filed", direction: "desc" }], max: 5000,
        }),
        listRecords(T.applications, {
          formula: has("Referred ERO Record ID", s.r),
          fields: [F.apName, F.apStatus, F.apEmail, F.apPhone, F.apDate, F.apHasPtin, F.apSigned, F.apPtinStep, F.apEroRid, "PTIN Verified", "Retainer Paid", "Software Access Given"],
          sort: [{ field: "Date Applied", direction: "desc" }], max: 500,
        }),
        listRecords(T.tickets, {
          formula: has("ERO Record ID", s.r),
          fields: [F.tNum, F.tSubject, F.tStatus, F.tPriority, F.tResponse, F.tSubmitted, F.tEroRid],
          sort: [{ field: "Submitted", direction: "desc" }], max: 200,
        }),
      ]);
      const team = preps.filter((r) => owns(r.fields[F.pEroRid], s.r));
      const names = Object.fromEntries(team.map((r) => [r.id, r.fields[F.pName] || ""]));
      const name = e[F.eName] || "";
      return json({
        ok: true,
        ero: {
          name, isBprep: String(name).toLowerCase().includes("{{BUSINESS_NAME}}".toLowerCase()),
          teamFunded: num(e[F.eTeamFunded]), sbFees: num(e[F.eSbFees]), rate: num(e[F.eRate]), bonus: num(e[F.eBonus]),
          eligible: num(e[F.eEligible]), retainer: num(e[F.eRetainer]), defaultSplit: num(e[F.eDefaultSplit]),
          link: e[F.eLink] || "", software: selName(e[F.eSoftware]),
        },
        team: team.map((r) => ({
          id: r.id, name: r.fields[F.pName] || "", email: r.fields[F.pEmail] || "", phone: r.fields[F.pPhone] || "",
          status: selName(r.fields[F.pStatus]), funded: num(r.fields[F.pFunded]), total: num(r.fields[F.pTotal]),
          earned: num(r.fields[F.pEarned]), split: num(r.fields[F.pSplit]), eroSplit: r.fields[F.pEroSplit] == null ? null : num(r.fields[F.pEroSplit]),
          retainerDue: num(r.fields[F.pRetainerDue]), retainerPaid: Boolean(r.fields[F.pRetainerPaid]), isNew: Boolean(r.fields[F.pNew]),
          hasPtin: Boolean(r.fields[F.pPtin]), owner: Boolean(r.fields[F.pOwner]), fundedBank: num(r.fields[F.pFundedBank]),
        })),
        returns: rets.filter((r) => owns(r.fields[F.rEroRid], s.r)).map((r) => ({
          ref: r.fields[F.rRef] || "", date: r.fields[F.rDate] || "", status: selName(r.fields[F.rStatus]) || "In Progress",
          fee: num(r.fields[F.rFee]), eroShare: num(r.fields[F.rEroShare]), verified: Boolean(r.fields[F.rVerified]),
          bank: Boolean(r.fields[F.rBank]), season: selName(r.fields[F.rSeason]),
          preparer: ((r.fields[F.rPrep] || []).map((id) => names[id]).filter(Boolean)[0]) || "",
        })),
        applications: apps.filter((r) => owns(r.fields[F.apEroRid], s.r)).map((r) => ({
          id: r.id, name: r.fields[F.apName] || "", status: selName(r.fields[F.apStatus]) || "Pending Review", email: r.fields[F.apEmail] || "",
          phone: r.fields[F.apPhone] || "", date: r.fields[F.apDate] || "", hasPtin: selName(r.fields[F.apHasPtin]),
          signed: Boolean(r.fields[F.apSigned]), ptinStep: selName(r.fields[F.apPtinStep]),
          ptinVerified: Boolean(r.fields["PTIN Verified"]), retainerPaid: Boolean(r.fields["Retainer Paid"]), softwareAccess: Boolean(r.fields["Software Access Given"]),
        })),
        tickets: tix.filter((r) => owns(r.fields[F.tEroRid], s.r)).map((r) => ({
          num: r.fields[F.tNum] || "", subject: r.fields[F.tSubject] || "", status: selName(r.fields[F.tStatus]) || "New",
          priority: selName(r.fields[F.tPriority]), response: r.fields[F.tResponse] || "", submitted: r.fields[F.tSubmitted] || "",
        })),
      });
    }

    if (route === "ero/settings" && isPost) {
      const b = await readJsonPost(req);
      if (!b) return fail("Bad request.");
      const ero = await getRecord(T.eros, s.r);
      const fields = {};
      if (b.retainer != null) {
        const v = Number(b.retainer);
        if (!(v >= 0 && v <= 5000)) return fail("Retainer must be between $0 and $5,000.");
        fields[F.eRetainer] = Math.round(v * 100) / 100;
      }
      if (b.defaultSplit != null) {
        if (String(ero.fields[F.eName] || "").toLowerCase().includes("{{BUSINESS_NAME}}".toLowerCase())) return fail("{{SHORT_NAME}}'s own team uses the 70/80 tiers.");
        const v = Number(b.defaultSplit);
        if (!(v >= 0 && v <= 100)) return fail("Split must be between 0 and 100.");
        fields[F.eDefaultSplit] = Math.round(v);
      }
      if (!Object.keys(fields).length) return fail("Nothing to save.");
      await updateRecord(T.eros, s.r, fields);
      return json({ ok: true, message: "Saved." });
    }

    if (route === "ero/application" && isPost) {
      // ERO (or an admin viewing that ERO) checks off an applicant's onboarding steps.
      const ONB = { agreementSigned: F.apSigned, ptinVerified: "PTIN Verified", retainerPaid: "Retainer Paid", softwareAccess: "Software Access Given" };
      const b = await readJsonPost(req);
      if (!b || !/^rec[A-Za-z0-9]{14}$/.test(String(b.id || "")) || !(b.step in ONB)) return fail("Bad request.");
      if (!s.r) return fail("Only EROs can update onboarding here.", 403);
      const app = await getRecord(T.applications, b.id);
      if (!owns(app.fields[F.apEroRid], s.r)) return fail("You can only update applicants on your own team.", 403);
      await updateRecord(T.applications, app.id, { [ONB[b.step]]: Boolean(b.done) });
      return json({ ok: true, message: "Saved." });
    }

    if (route === "ero/preparer" && isPost) {
      const b = await readJsonPost(req);
      if (!b || !b.id) return fail("Bad request.");
      const cur = await getRecord(T.preparers, String(b.id));
      if (!owns(cur.fields[F.pEroRid], s.r)) return fail("You can only change preparers on your own team.", 403);
      const ero = await getRecord(T.eros, s.r);
      const fields = {};
      if ("split" in b) {
        if (String(ero.fields[F.eName] || "").toLowerCase().includes("{{BUSINESS_NAME}}".toLowerCase())) return fail("{{SHORT_NAME}}'s own team uses the 70/80 tiers.");
        if (b.split === null || b.split === "") fields[F.pEroSplit] = null;
        else { const v = Number(b.split); if (!(v >= 0 && v <= 100)) return fail("Split must be between 0 and 100."); fields[F.pEroSplit] = Math.round(v); }
      }
      if ("retainerPaid" in b) fields[F.pRetainerPaid] = Boolean(b.retainerPaid);
      if (!Object.keys(fields).length) return fail("Nothing to save.");
      await updateRecord(T.preparers, cur.id, fields);
      return json({ ok: true, message: "Saved." });
    }

    return fail("Not found.", 404);
  } catch (err) {
    console.error("portal-data", route, err.message);
    return fail("Something went wrong. Please try again in a minute.", 500);
  }
};

export const config = {
  path: ["/api/portal/resources", "/api/portal/admin", "/api/portal/admin/update", "/api/portal/admin/verify", "/api/portal/whoami", "/api/portal/returns", "/api/portal/corrections", "/api/portal/agreement", "/api/portal/past-clients", "/api/portal/ero", "/api/portal/ero/settings", "/api/portal/ero/preparer", "/api/portal/ero/application"],
};

// ---------------- Admin (sees everything) ----------------
async function admin(route, req, isPost) {
  if (route === "admin/verify" && isPost) {
    const b = await readJsonPost(req);
    if (!b || !/^rec[A-Za-z0-9]{14}$/.test(String(b.id || ""))) return fail("Bad request.");
    await updateRecord(T.returns, b.id, { [F.rVerified]: Boolean(b.verified) });
    return json({ ok: true, message: b.verified ? "Verified" : "Unverified" });
  }
  if (route === "admin/update" && isPost) return adminUpdate(await readJsonPost(req));
  if (route !== "admin") return fail("Not found.", 404);

  // Two small batches so Airtable's rate limit (5 requests/second) isn't hit.
  const [eros, preps, rets, apps] = await Promise.all([
    listRecords(T.eros, { fields: [F.eName, F.eEmail, F.eTeamFunded, F.eBonus, F.eEligible, F.eSoftware, F.eRetainer, F.eDefaultSplit, F.eLink] }),
    listRecords(T.preparers, { fields: [F.pName, F.pEmail, F.pPhone, F.pEro, F.pStatus, F.pTotal, F.pFunded, F.pEarned, F.pPending, F.pSplit, F.pPaidBy, F.pRetainerDue, F.pPtin, F.pOwner] }),
    listRecords(T.returns, {
      fields: [F.rRef, F.rDate, F.rStatus, F.rFee, F.rVerified, F.rBank, F.rPrep, F.rSeason, F.rShare, F.rSbFee, "BPrep Share", "BPrep Owes Preparer", F.rEroShare],
      sort: [{ field: "Date Filed", direction: "desc" }], max: 20000,
    }),
    listRecords(T.applications, { fields: [F.apName, F.apStatus, F.apEmail, F.apPhone, F.apDate, F.apHasPtin, F.apSigned, F.apPtinStep, "Team", "Opportunity", "PTIN Verified", "Retainer Paid", "Software Access Given", "Notes", "IRS Training Score", "State", "Experience", "Has EFIN"], sort: [{ field: "Date Applied", direction: "desc" }] }),
  ]);
  const [sales, tix, refs, acad] = await Promise.all([
    listRecords(T.sales, { fields: ["Buyer", "Business", "Email", "Phone", "Package", "Price", "Status", "Sale Date"] }),
    listRecords(T.tickets, { fields: [F.tNum, F.tSubject, F.tStatus, F.tPriority, F.tSubmitted, "ERO", "Submitted By", "Description", F.tResponse, "Internal Notes", "Email", "Phone", "Screenshot Link", "Category"], sort: [{ field: "Submitted", direction: "desc" }] }),
    listRecords(T.referrers, { fields: ["Name", "Referral Code", "Payout Method", "Payout Handle", "Total Referrals", "Earned", "Paid Out", "Owed", "W-9 on File"] }),
    listRecords(T.academy, { fields: ["Name", "Email", "Class Selected (from website)", "Paid", "Amount Due", "Registered On", "Team (ERO)"] }),
  ]);
  const [refls, agrs] = await Promise.all([
    listRecords("Referrals", { fields: ["Client Name", "Referrer", "Status", "Paid", "Consent to Notify Referrer", "Client Phone", "Client Email"], sort: [{ field: "Referred On", direction: "desc" }] }),
    listRecords(T.agreements, { formula: "NOT({Approved})", fields: ["Signer Name", "Team", F.aType, "Email", F.aSignedAt, "Countersigned PDF Link", "Signer Copy Link", F.aFinal, "PTIN", "EFIN", "Business Name"] }),
  ]);
  const refName = Object.fromEntries(refs.map((r) => [r.id, r.fields["Name"] || ""]));
  const eroName = Object.fromEntries(eros.map((r) => [r.id, (r.fields[F.eName] || "").replace(/\s*\(.*\)\s*$/, "")]));
  const prepInfo = Object.fromEntries(preps.map((r) => [r.id, { name: r.fields[F.pName] || "", ero: eroName[(r.fields[F.pEro] || [])[0]] || "" }]));
  const f = (r, id) => r.fields[id];
  return json({
    ok: true,
    eros: eros.map((r) => ({
      id: r.id, name: f(r, F.eName) || "", email: f(r, F.eEmail) || "", teamFunded: num(f(r, F.eTeamFunded)), bonus: num(f(r, F.eBonus)),
      eligible: num(f(r, F.eEligible)), software: selName(f(r, F.eSoftware)), retainer: num(f(r, F.eRetainer)), defaultSplit: num(f(r, F.eDefaultSplit)),
      team: preps.filter((p) => (p.fields[F.pEro] || []).includes(r.id)).length,
    })),
    preparers: preps.map((r) => ({
      id: r.id, name: f(r, F.pName) || "", email: f(r, F.pEmail) || "", phone: f(r, F.pPhone) || "", ero: (prepInfo[r.id] || {}).ero,
      status: selName(f(r, F.pStatus)), total: num(f(r, F.pTotal)), funded: num(f(r, F.pFunded)), earned: num(f(r, F.pEarned)),
      pending: num(f(r, F.pPending)), split: num(f(r, F.pSplit)), paidBy: f(r, F.pPaidBy) || "", retainerDue: num(f(r, F.pRetainerDue)),
      hasPtin: Boolean(f(r, F.pPtin)), owner: Boolean(f(r, F.pOwner)),
    })),
    returns: rets.map((r) => {
      const pid = (f(r, F.rPrep) || [])[0], pi = prepInfo[pid] || {};
      return {
        id: r.id, ref: f(r, F.rRef) || "", date: f(r, F.rDate) || "", status: selName(f(r, F.rStatus)) || "In Progress", fee: num(f(r, F.rFee)),
        verified: Boolean(f(r, F.rVerified)), bank: Boolean(f(r, F.rBank)), season: selName(f(r, F.rSeason)), preparer: pi.name || "", ero: pi.ero || "",
        prepShare: num(f(r, F.rShare)), sbFee: num(f(r, F.rSbFee)), bprepShare: num(f(r, "BPrep Share")), owes: num(f(r, "BPrep Owes Preparer")), eroShare: num(f(r, F.rEroShare)),
      };
    }),
    applications: apps.map((r) => ({
      id: r.id, ptinVerified: Boolean(f(r, "PTIN Verified")), retainerPaid: Boolean(f(r, "Retainer Paid")), softwareAccess: Boolean(f(r, "Software Access Given")),
      notes: f(r, "Notes") || "", score: f(r, "IRS Training Score"), state: f(r, "State") || "", experience: selName(f(r, "Experience")), hasEfin: selName(f(r, "Has EFIN")),
      name: f(r, F.apName) || "", status: selName(f(r, F.apStatus)) || "Pending Review", email: f(r, F.apEmail) || "", phone: f(r, F.apPhone) || "",
      date: f(r, F.apDate) || "", ptinStep: selName(f(r, F.apPtinStep)), hasPtin: selName(f(r, F.apHasPtin)), signed: Boolean(f(r, F.apSigned)),
      team: f(r, "Team") || "", opportunity: selName(f(r, "Opportunity")),
    })),
    sales: sales.map((r) => ({
      id: r.id, buyer: f(r, "Buyer") || "", business: f(r, "Business") || "", email: f(r, "Email") || "", phone: f(r, "Phone") || "",
      pkg: selName(f(r, "Package")), price: num(f(r, "Price")), status: selName(f(r, "Status")), date: f(r, "Sale Date") || "",
    })),
    tickets: tix.map((r) => ({
      id: r.id, description: f(r, "Description") || "", response: f(r, F.tResponse) || "", internal: f(r, "Internal Notes") || "",
      email: f(r, "Email") || "", phone: f(r, "Phone") || "", screenshot: f(r, "Screenshot Link") || "", category: selName(f(r, "Category")),
      num: f(r, F.tNum) || "", subject: f(r, F.tSubject) || "", status: selName(f(r, F.tStatus)) || "New", priority: selName(f(r, F.tPriority)),
      submitted: f(r, F.tSubmitted) || "", ero: eroName[(f(r, "ERO") || [])[0]] || f(r, "Submitted By") || "",
    })),
    referrers: refs.map((r) => ({
      name: f(r, "Name") || "", code: f(r, "Referral Code") || "", method: selName(f(r, "Payout Method")), handle: f(r, "Payout Handle") || "",
      referrals: num(f(r, "Total Referrals")), earned: num(f(r, "Earned")), paid: num(f(r, "Paid Out")), owed: num(f(r, "Owed")), w9: Boolean(f(r, "W-9 on File")),
    })),
    referrals: refls.map((r) => ({
      id: r.id, client: f(r, "Client Name") || "", referrer: (f(r, "Referrer") || []).map((id) => refName[id]).filter(Boolean).join(", "),
      status: selName(f(r, "Status")) || "Referred", paid: Boolean(f(r, "Paid")), consent: Boolean(f(r, "Consent to Notify Referrer")),
      phone: f(r, "Client Phone") || "", email: f(r, "Client Email") || "", date: r.createdTime,
    })),
    agreements: agrs.map((r) => ({
      id: r.id, signer: f(r, "Signer Name") || "", team: f(r, "Team") || "", type: selName(f(r, F.aType)), email: f(r, "Email") || "",
      signedAt: f(r, F.aSignedAt) || "", countersigned: f(r, "Countersigned PDF Link") || "", signerCopy: f(r, "Signer Copy Link") || "",
      hasFinal: files(f(r, F.aFinal)).length > 0, ptin: f(r, "PTIN") || "", efin: f(r, "EFIN") || "", business: f(r, "Business Name") || "",
    })),
    academy: acad.map((r) => ({
      name: f(r, "Name") || "", email: f(r, "Email") || "", cls: f(r, "Class Selected (from website)") || "", paid: Boolean(f(r, "Paid")),
      due: num(f(r, "Amount Due")), date: f(r, "Registered On") || "", team: f(r, "Team (ERO)") || "",
    })),
  });
}

// Fields the admin can change from the portal, per table. Anything not listed here is ignored.
const EDITABLE = {
  applications: { table: T.applications, fields: {
    status: ["Status", ["Pending Review", "Interview", "Approved - Onboarding", "Active", "Declined"]],
    ptinStep: ["PTIN Step", ["Needs a new PTIN", "Has PTIN, update IRS info to BPrep", "PTIN done"]],
    ptinVerified: ["PTIN Verified", "bool"], agreementSigned: ["Agreement Signed", "bool"], retainerPaid: ["Retainer Paid", "bool"],
    softwareAccess: ["Software Access Given", "bool"], notes: ["Notes", "text"],
  } },
  sales: { table: T.sales, fields: { status: ["Status", ["Inquiry", "Invoice Sent", "Agreement Signed", "Paid", "Setup Scheduled", "Active", "Cancelled"]] } },
  tickets: { table: T.tickets, fields: {
    status: ["Status", ["New", "In Progress", "Waiting on ERO", "Resolved", "Closed"]], response: ["Response to ERO", "text"], internal: ["Internal Notes", "text"],
  } },
  referrals: { table: "Referrals", fields: { status: ["Status", ["Referred", "Return Filed", "Funded", "Not Eligible"]], paid: ["Paid", "bool"] } },
};

async function adminUpdate(b) {
  if (!b || !/^rec[A-Za-z0-9]{14}$/.test(String(b.id || ""))) return fail("Bad request.");
  if (b.kind === "agreement-approve") {
    const cur = await getRecord(T.agreements, b.id);
    const fields = { [F.aApproved]: true };
    if (!files(cur.fields[F.aFinal]).length) {
      const link = cur.fields["Countersigned PDF Link"];
      if (!link) return fail("There's no countersigned PDF link on this agreement. Upload the final copy in Airtable instead.");
      const ok = await fetch(link, { method: "GET", headers: { Range: "bytes=0-0" } }).then((r) => r.ok || r.status === 206).catch(() => false);
      if (!ok) return fail("The countersigned PDF link has expired. Download it from the Netlify form submission and upload it to Final Signed Copy in Airtable, then approve.");
      fields[F.aFinal] = [{ url: link, filename: `Approved Agreement - ${cur.fields["Signer Name"] || "Signer"}.pdf` }];
    }
    await updateRecord(T.agreements, cur.id, fields);
    return json({ ok: true, message: "Approved. The signer gets their copy by email and in their portal." });
  }
  const spec = EDITABLE[b.kind];
  if (!spec || !b.fields || typeof b.fields !== "object") return fail("Bad request.");
  const out = {};
  for (const [k, v] of Object.entries(b.fields)) {
    const def = spec.fields[k];
    if (!def) continue;
    const [fid, rule] = def;
    if (rule === "bool") out[fid] = Boolean(v);
    else if (rule === "text") out[fid] = clip(v, 5000);
    else if (Array.isArray(rule)) { if (!rule.includes(v)) return fail("That status isn't allowed."); out[fid] = v; }
  }
  if (!Object.keys(out).length) return fail("Nothing to save.");
  await updateRecord(spec.table, b.id, out);
  return json({ ok: true, message: "Saved" });
}
