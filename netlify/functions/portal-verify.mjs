// POST /api/portal/verify  { email, code }
// Checks the code and, if it matches, signs the person in with a secure cookie.
import { json, configured, readJsonPost, cleanEmail, findPerson, listRecords, updateRecord, hashCode, safeEqual, makeSession, sessionCookie, SESSION_DAYS, q, T, F } from "../lib/core.mjs";

const BAD = { ok: false, message: "That code didn't work. Check it and try again, or request a new one." };

export default async (req) => {
  if (!configured()) return json({ ok: false, message: "The portal isn't set up yet." }, 503);
  const body = await readJsonPost(req);
  const email = body && cleanEmail(body.email);
  const code = body && String(body.code || "").replace(/\D/g, "");
  if (!email || code.length !== 6) return json(BAD, 400);
  try {
    const rows = await listRecords(T.logins, {
      formula: `AND(LOWER({${F.lEmail}})=${q(email)}, NOT({${F.lUsed}}), IS_AFTER({${F.lExpires}}, NOW()))`,
      fields: [F.lHash, F.lAttempts],
      sort: [{ field: "Created", direction: "desc" }],
      max: 1,
    });
    const row = rows[0];
    if (!row) return json({ ok: false, message: "That code has expired. Please request a new one." }, 400);
    const attempts = Number(row.fields[F.lAttempts] || 0);
    if (attempts >= 5) return json({ ok: false, message: "Too many tries. Please request a new code." }, 429);

    if (!safeEqual(row.fields[F.lHash] || "", hashCode(email, code))) {
      await updateRecord(T.logins, row.id, { [F.lAttempts]: attempts + 1 });
      return json(BAD, 400);
    }
    await updateRecord(T.logins, row.id, { [F.lUsed]: true, [F.lAttempts]: attempts + 1 });

    const person = await findPerson(email);
    if (!person) return json({ ok: false, message: "This email no longer has portal access. Contact {{SHORT_NAME}}." }, 403);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(makeSession(person, email), SESSION_DAYS * 86400) });
  } catch (err) {
    console.error("verify", err.message);
    return json({ ok: false, message: "Something went wrong. Please try again in a minute." }, 500);
  }
};

export const config = { path: "/api/portal/verify" };
