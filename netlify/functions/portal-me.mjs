// GET /api/portal/me  - everything the portal home page shows, for the signed-in person only.
// The person's record IDs come from the signed cookie, never from the browser, so no one can ask for someone else's data.
import { json, configured, readSession, getRecord, listRecords, owns, viewAs, T, F } from "../lib/core.mjs";

const num = (v) => (typeof v === "number" ? v : Array.isArray(v) ? Number(v[0]) || 0 : Number(v) || 0);
const selName = (v) => (v && typeof v === "object" ? v.name : v) || "";

export default async (req) => {
  if (!configured()) return json({ ok: false, message: "The portal isn't set up yet." }, 503);
  const real = readSession(req);
  if (!real) return json({ ok: false, signedOut: true }, 401);
  const s = viewAs(req, real).s;
  try {
    const out = { ok: true, name: s.n, email: s.e, roles: { preparer: Boolean(s.p), ero: Boolean(s.r) } };

    if (s.p) {
      const prep = await getRecord(T.preparers, s.p);
      const f = prep.fields;
      if (selName(f[F.pStatus]) === "Inactive") return json({ ok: false, signedOut: true, message: "Your portal access is turned off. Contact {{SHORT_NAME}}." }, 403);
      let eroName = "";
      const eroId = (f[F.pEro] || [])[0];
      if (eroId) { try { eroName = (await getRecord(T.eros, eroId)).fields[F.eName] || ""; } catch {} }

      const returns = await listRecords(T.returns, {
        formula: `FIND('${prep.id}', {Preparer Record ID})`,
        fields: [F.rRef, F.rDate, F.rStatus, F.rFee, F.rShare, F.rPending, F.rVerified, F.rBank, F.rSeason, F.rPrepRid],
        sort: [{ field: "Date Filed", direction: "desc" }],
        max: 2000,
      });

      out.preparer = {
        name: f[F.pName] || s.n,
        ero: eroName,
        paidBy: f[F.pPaidBy] || "",
        owner: Boolean(f[F.pOwner]),
        split: num(f[F.pSplit]),
        tier: f[F.pTier] || "",
        funded: num(f[F.pFunded]),
        totalReturns: num(f[F.pTotal]),
        earned: num(f[F.pEarned]),
        pending: num(f[F.pPending]),
        retainerDue: num(f[F.pRetainerDue]),
        hasPtin: Boolean(f[F.pPtin]),
      };
      out.returns = returns.filter((r) => owns(r.fields[F.rPrepRid], prep.id)).map((r) => ({
        ref: r.fields[F.rRef] || "",
        date: r.fields[F.rDate] || "",
        status: selName(r.fields[F.rStatus]) || "In Progress",
        fee: num(r.fields[F.rFee]),
        share: num(r.fields[F.rShare]),
        pendingShare: num(r.fields[F.rPending]),
        verified: Boolean(r.fields[F.rVerified]),
        bank: Boolean(r.fields[F.rBank]),
        season: selName(r.fields[F.rSeason]),
      }));
    }
    return json(out);
  } catch (err) {
    console.error("me", err.message);
    return json({ ok: false, message: "We couldn't load your info. Please refresh in a minute." }, 500);
  }
};

export const config = { path: "/api/portal/me" };
