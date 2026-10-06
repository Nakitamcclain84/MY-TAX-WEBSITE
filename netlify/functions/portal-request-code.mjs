// POST /api/portal/request-code  { email }
// Emails a 6-digit sign-in code (through the Airtable "Portal: email sign-in code" automation).
// Always answers the same way whether or not the email is on file, so no one can fish for emails.
import { json, configured, readJsonPost, cleanEmail, findPerson, listRecords, createRecord, hashCode, randomCode, q, T, F } from "../lib/core.mjs";

const GENERIC = { ok: true, message: "If that email is on file, we just sent a 6-digit code. It works for 10 minutes." };

export default async (req) => {
  if (!configured()) return json({ ok: false, message: "The portal isn't set up yet. Please try again later." }, 503);
  const body = await readJsonPost(req);
  const email = body && cleanEmail(body.email);
  if (!email) return json({ ok: false, message: "Please enter a valid email address." }, 400);
  try {
    // Limit: 3 codes per email per 15 minutes.
    const recent = await listRecords(T.logins, {
      formula: `AND(LOWER({${F.lEmail}})=${q(email)}, IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -15, 'minutes')))`,
      fields: [F.lEmail], max: 5,
    });
    if (recent.length >= 3) return json({ ok: false, message: "Too many codes requested. Please wait 15 minutes and try again." }, 429);

    const person = await findPerson(email);
    if (!person) return json(GENERIC);

    const code = randomCode();
    await createRecord(T.logins, {
      [F.lEmail]: email,
      [F.lCode]: code,
      [F.lHash]: hashCode(email, code),
      [F.lName]: String(person.name).split(" ")[0],
      [F.lRole]: [person.preparerId && "preparer", person.eroId && "ero"].filter(Boolean).join("+"),
      [F.lExpires]: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      [F.lAttempts]: 0,
    });
    return json(GENERIC);
  } catch (err) {
    console.error("request-code", err.message);
    return json({ ok: false, message: "Something went wrong. Please try again in a minute." }, 500);
  }
};

export const config = { path: "/api/portal/request-code" };
