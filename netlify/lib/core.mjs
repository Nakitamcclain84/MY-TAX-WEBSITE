// Shared helpers for the {{SHORT_NAME}} portal functions.
// Secrets live in Netlify environment variables, never in this file:
//   AIRTABLE_TOKEN  - Airtable personal access token (read/write on the {{SHORT_NAME}} base only)
//   SESSION_SECRET  - long random string used to sign sign-in cookies
import crypto from "node:crypto";

export const BASE = (globalThis.Netlify && Netlify.env.get("AIRTABLE_BASE_ID")) || process.env.AIRTABLE_BASE_ID || "";
export const T = {
  preparers: "Preparers",
  eros: "EROs",
  returns: "Returns",
  logins: "Portal Logins",
  corrections: "Correction Requests",
  pastClients: "Past Clients",
  agreements: "Signed Agreements",
  applications: "Applications",
  tickets: "Support Tickets",
  sales: "Software Sales",
  referrers: "Referrers",
  academy: "Academy Registrations",
};

// People who see everything in the portal (Admin dashboard + "view as").
export const ADMIN_EMAILS = String((globalThis.Netlify && Netlify.env.get("ADMIN_EMAILS")) || process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
export const isAdminEmail = (e) => ADMIN_EMAILS.includes(String(e || "").toLowerCase());
export const F = {
  // Preparers
  pName: "Name", pEmail: "Email", pEro: "ERO", pStatus: "Status",
  pFunded: "Funded Clients", pSplit: "Split %", pTier: "Tier", pEarned: "Total Earned",
  pPending: "Pending Earnings", pTotal: "Total Returns", pPaidBy: "Paid By", pOwner: "Owner (keeps 100%)",
  pRetainerDue: "Retainer Due", pPtin: "PTIN", pPhone: "Phone", pEroSplit: "ERO-Set Split %",
  pRetainerPaid: "Retainer Paid", pNew: "New Preparer (owes retainer)", pAgreementFile: "Signed Agreement", pFundedBank: "Funded Bank Products",
  pEroRid: "ERO Record ID",
  // EROs
  eName: "Name", eEmail: "Email", eTeamFunded: "Team Funded Returns", eSbFees: "Team SB Fees",
  eRate: "Current Bonus Rate ($/return)", eBonus: "Bonus Earned", eEligible: "Bonus-Eligible Returns", eRetainer: "New Preparer Retainer",
  eDefaultSplit: "Default Preparer Split %", eLink: "Team Application Link", eCode: "Team Code", eSoftware: "Software",
  // Returns
  rRef: "Client Ref", rDate: "Date Filed", rStatus: "Status", rFee: "Prep Fee",
  rShare: "Preparer Share", rPending: "Pending Share", rVerified: "BPrep Verified", rBank: "Bank Product",
  rSeason: "Tax Season", rPrep: "Preparer", rClientFirst: "Client First Name", rClientEmail: "Client Email (for review request)",
  rEroShare: "ERO Share", rFundedBank: "Funded Bank Product", rIsFunded: "Is Funded", rPrepRid: "Preparer Record ID",
  rEroRid: "ERO Record ID", rSbFee: "Service Bureau Fee",
  // Correction Requests
  cRef: "Client Ref", cBy: "Requested By", cEmail: "Email", cPrep: "Preparer",
  cWhat: "What Needs Fixing", cStatus: "Status", cNotes: "Admin Notes", cPrepRid: "Preparer Record ID",
  // Past Clients
  pcName: "Client Name", pcPhone: "Phone", pcEmail: "Email", pcYear: "Tax Year",
  pcFiling: "Filing Status", pcFee: "Prep Fee", pcFollow: "Follow-Up", pcNotes: "Notes",
  pcPrepRid: "Preparer Record ID",
  // Signed Agreements
  aType: "Agreement Type", aSignedAt: "Signed At", aFinal: "Final Signed Copy", aApproved: "Approved",
  aPrepRid: "Preparer Record ID",
  // Applications
  apName: "Name", apStatus: "Status", apEmail: "Email", apPhone: "Phone",
  apDate: "Date Applied", apHasPtin: "Has PTIN", apSigned: "Agreement Signed", apPtinStep: "PTIN Step",
  apEroRid: "Referred ERO Record ID",
  // Support Tickets
  tNum: "Ticket #", tSubject: "Subject", tStatus: "Status", tPriority: "Priority",
  tResponse: "Response to ERO", tSubmitted: "Submitted", tEroRid: "ERO Record ID",
  // Portal Logins
  lEmail: "Email", lCode: "Code", lHash: "Code Hash", lName: "Name",
  lRole: "Role", lExpires: "Expires At", lAttempts: "Attempts", lUsed: "Used",
};

const env = (k) => (globalThis.Netlify && Netlify.env.get(k)) || process.env[k] || "";

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
  });
}

export function configured() {
  return Boolean(env("AIRTABLE_TOKEN") && env("AIRTABLE_BASE_ID") && env("SESSION_SECRET").length >= 32);
}

// ---------- Airtable ----------
async function at(path, init = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env("AIRTABLE_TOKEN")}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 429 && !init._retried) {
    await new Promise((r) => setTimeout(r, 1100));
    return at(path, { ...init, _retried: true });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// Escape a value for use inside a single-quoted Airtable formula string.
export const q = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

export async function listRecords(table, { formula, fields, sort, max = 1000 } = {}) {
  const out = [];
  let offset;
  do {
    const p = new URLSearchParams({ returnFieldsByFieldId: "false", pageSize: "100" });
    if (formula) p.set("filterByFormula", formula);
    (fields || []).forEach((f) => p.append("fields[]", f));
    (sort || []).forEach((s, i) => { p.set(`sort[${i}][field]`, s.field); p.set(`sort[${i}][direction]`, s.direction || "asc"); });
    if (offset) p.set("offset", offset);
    const data = await at(`${encodeURIComponent(table)}?${p}`);
    out.push(...data.records);
    offset = data.offset;
  } while (offset && out.length < max);
  return out.slice(0, max);
}

export async function getRecord(table, id) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new Error("bad record id");
  return at(`${encodeURIComponent(table)}/${id}?returnFieldsByFieldId=false`);
}

export async function createRecord(table, fields) {
  const data = await at(`${encodeURIComponent(table)}?returnFieldsByFieldId=false`, { method: "POST", body: JSON.stringify({ records: [{ fields }] }) });
  return data.records[0];
}

export async function updateRecord(table, id, fields) {
  return at(`${encodeURIComponent(table)}/${id}?returnFieldsByFieldId=false`, { method: "PATCH", body: JSON.stringify({ fields }) });
}

// ---------- People ----------
export function cleanEmail(e) {
  e = String(e || "").trim().toLowerCase();
  return /^[^\s@'"\\]+@[^\s@'"\\]+\.[a-z]{2,}$/.test(e) && e.length <= 120 ? e : null;
}

// Finds the preparer and/or ERO records that belong to an email.
export async function findPerson(email) {
  const [preps, eros] = await Promise.all([
    listRecords(T.preparers, {
      formula: `AND(LOWER(TRIM({${F.pEmail}}))=${q(email)}, {${F.pStatus}}!='Inactive')`,
      fields: [F.pName], max: 1,
    }),
    listRecords(T.eros, { formula: `LOWER(TRIM({${F.eEmail}}))=${q(email)}`, fields: [F.eName], max: 1 }),
  ]);
  const p = preps[0], e = eros[0];
  if (!p && !e) return isAdminEmail(email) ? { preparerId: null, eroId: null, name: "Admin" } : null;
  const name = (p && p.fields[F.pName]) || (e && e.fields[F.eName]) || "";
  return { preparerId: p ? p.id : null, eroId: e ? e.id : null, name };
}

// ---------- Codes & sessions ----------
export function hashCode(email, code) {
  return crypto.createHmac("sha256", env("SESSION_SECRET")).update(`code:${email}:${code}`).digest("hex");
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", env("SESSION_SECRET")).update(`session:${data}`).digest("base64url");

export const COOKIE = "bp_portal";
export const SESSION_DAYS = 7;

export function makeSession(person, email) {
  const payload = b64(JSON.stringify({
    e: email, p: person.preparerId, r: person.eroId, n: person.name, a: isAdminEmail(email),
    x: Date.now() + SESSION_DAYS * 864e5,
  }));
  return `${payload}.${sign(payload)}`;
}

export function readSession(req) {
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString());
    return s.x > Date.now() ? s : null;
  } catch { return null; }
}

export function sessionCookie(value, maxAgeSec) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export function randomCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// Only accept JSON POSTs from our own pages.
export async function readJsonPost(req) {
  if (req.method !== "POST") return null;
  if (!(req.headers.get("content-type") || "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}

// ---------- small value helpers ----------
export const num = (v) => (typeof v === "number" ? v : Array.isArray(v) ? Number(v[0]) || 0 : Number(v) || 0);
export const selName = (v) => (v && typeof v === "object" ? v.name : v) || "";
export const files = (v) => (Array.isArray(v) ? v.map((a) => ({ name: a.filename, url: a.url, type: a.type })) : []);
// True if a comma-joined "Record ID" rollup contains this exact record id.
export const owns = (rollup, id) => String(rollup || "").split(",").map((x) => x.trim()).includes(id);

// Admin "view as": lets an admin open any preparer's or ERO's portal read-only (?as=recXXXX).
export function viewAs(req, s) {
  const as = new URL(req.url).searchParams.get("as") || "";
  if (!s.a || !/^rec[A-Za-z0-9]{14}$/.test(as)) return { s, viewing: false };
  return { s: { ...s, p: as, r: as }, viewing: true, as };
}
