// GET /api/portal/setup-check - tells the business owner what's set up and what's missing.
// It never returns secret values. It only says yes/no and which table or field has a problem.
import { json, BASE, T, F, ADMIN_EMAILS } from "../lib/core.mjs";

const env = (k) => (globalThis.Netlify && Netlify.env.get(k)) || process.env[k] || "";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The tables and a few key fields the portal depends on.
const NEED = [
  [T.preparers, [F.pName, F.pEmail, F.pEroRid, F.pPaidBy, F.pSplit]],
  [T.eros, [F.eName, F.eEmail, F.eBonus]],
  [T.returns, [F.rRef, F.rPrepRid, F.rEroRid, F.rVerified]],
  [T.logins, [F.lEmail, F.lCode, F.lHash]],
  [T.applications, [F.apName, F.apEroRid, "PTIN Verified", "Retainer Paid", "Software Access Given"]],
  [T.corrections, [F.cRef, F.cPrepRid]],
  [T.pastClients, [F.pcName, F.pcPrepRid]],
  [T.agreements, [F.aType, F.aPrepRid]],
  [T.tickets, [F.tSubject, F.tEroRid]],
  [T.sales, ["Buyer", "Status"]],
  [T.referrers, ["Name", "Referral Code"]],
  ["Referrals", ["Client Name", "Status"]],
  [T.academy, ["Name", "Email"]],
  ["Portal Links", ["Title", "Link"]],
];

export default async () => {
  const token = env("AIRTABLE_TOKEN"), secret = env("SESSION_SECRET");
  const out = {
    ok: true,
    settings: {
      AIRTABLE_TOKEN: Boolean(token),
      AIRTABLE_BASE_ID: /^app[A-Za-z0-9]{14}$/.test(BASE),
      SESSION_SECRET: secret.length >= 32,
      ADMIN_EMAILS: ADMIN_EMAILS.length > 0,
    },
    airtable: null,
    tables: [],
    eroCount: null,
  };
  if (!token || !out.settings.AIRTABLE_BASE_ID) return json(out);

  for (const [table, fields] of NEED) {
    const p = new URLSearchParams({ pageSize: "1", maxRecords: "1", returnFieldsByFieldId: "false" });
    fields.forEach((f) => p.append("fields[]", f));
    let status = 0, problem = "";
    try {
      const res = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      status = res.status;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = String((body.error && (body.error.message || body.error.type || body.error)) || "");
        const m = msg.match(/Unknown field name: "([^"]+)"/);
        problem = m ? `Missing field "${m[1]}"` : status === 401 ? "Airtable key is wrong" : status === 403 ? "Airtable key can't open this base" : status === 404 ? "Table not found" : `Airtable error ${status}`;
      } else if (table === T.eros) {
        const all = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?pageSize=5&fields%5B%5D=${encodeURIComponent(F.eName)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (all.ok) out.eroCount = ((await all.json()).records || []).length;
      }
    } catch { problem = "Couldn't reach Airtable"; }
    out.tables.push({ table, ok: !problem, problem });
    if (status === 401 || status === 403) { out.airtable = problem; break; }
    await wait(220); // stay under Airtable's 5 requests per second
  }
  if (!out.airtable) out.airtable = out.tables.every((t) => t.ok) ? "ok" : "some problems";
  return json(out);
};

export const config = { path: "/api/portal/setup-check" };
