// Saves website form sign-ups straight into Airtable (no webhook setup needed).
//   kind "application" -> Applications table (Status: Pending Review)
//   kind "academy"     -> Academy Registrations table
// Netlify Forms still keeps its own copy and emails the owner (turn on in Netlify: Forms > Form notifications).
// Uses the same AIRTABLE_TOKEN and AIRTABLE_BASE_ID environment variables as the portal.
const env = (k) => (globalThis.Netlify && Netlify.env.get(k)) || process.env[k] || "";
const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
const cleanEmail = (e) => { e = clip(e, 120).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) ? e : ""; };
const today = () => new Date().toISOString().slice(0, 10);

async function create(table, fields) {
  for (const k of Object.keys(fields)) if (fields[k] === "" || fields[k] == null) delete fields[k];
  const res = await fetch(`https://api.airtable.com/v0/${env("AIRTABLE_BASE_ID")}/${encodeURIComponent(table)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("AIRTABLE_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  if (!env("AIRTABLE_TOKEN") || !env("AIRTABLE_BASE_ID")) return json({ ok: false, message: "Not set up." }, 503);
  let b;
  try { b = await req.json(); } catch { return json({ ok: false }, 400); }
  const d = (b && b.data) || {};
  if (clip(d["bot-field"], 5)) return json({ ok: true });
  try {
    if (b.kind === "application") {
      const name = clip(`${clip(d["first-name"], 60)} ${clip(d["last-name"], 60)}`, 120);
      const email = cleanEmail(d.email);
      if (!name || !email) return json({ ok: false, message: "Name and email are required." }, 400);
      const notes = [
        d["software-choice"] && `Software: ${clip(d["software-choice"], 80)}`,
        d["referred-by-ero"] && `Referred by: ${clip(d["referred-by-ero"], 120)}`,
        d["sms-consent"] && "OK to text",
      ].filter(Boolean).join("\n");
      await create("Applications", {
        "Name": name, "Status": "Pending Review", "Opportunity": clip(d.opportunity, 80), "Email": email,
        "Phone": clip(d.phone, 30), "State": clip(d.state, 4), "Contact Method": clip(d["contact-method"], 30),
        "Work Location": clip(d["work-location"], 40), "Has PTIN": clip(d["has-ptin"], 20), "Has EFIN": clip(d["has-efin"], 20),
        "Experience": clip(d.experience, 20), "Date Applied": today(), "ERO Not Listed (name)": clip(d["ero-not-listed"], 120),
        "Notes": notes,
      });
      return json({ ok: true });
    }
    if (b.kind === "academy") {
      const email = cleanEmail(d.email);
      if (!clip(d.name, 120) || !email) return json({ ok: false, message: "Name and email are required." }, 400);
      const seats = parseInt(String(d.seats || "1"), 10) || 1;
      await create("Academy Registrations", {
        "Name": clip(d.name, 120), "Email": email, "Phone": clip(d.phone, 30), "Seats": seats,
        "Registered On": today(), "Class Selected (from website)": clip(d.class, 300),
      });
      return json({ ok: true });
    }
    return json({ ok: false }, 400);
  } catch (err) {
    console.error("form-capture", err.message);
    return json({ ok: false, message: "Saved to the website, but not to Airtable." }, 500);
  }
};

export const config = { path: "/api/form-capture" };
