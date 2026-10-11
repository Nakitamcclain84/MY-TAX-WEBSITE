// Public list of preparer names for the "Your preparer" dropdowns (no sign-in needed).
// Only names go out. No emails, phones or pay info.
import { T, F, json, listRecords, selName } from "../lib/core.mjs";

export default async () => {
  try {
    const rows = await listRecords(T.preparers, { fields: [F.pName, F.pStatus], max: 500 });
    const list = rows
      .filter((r) => r.fields[F.pName] && selName(r.fields[F.pStatus]) !== "Inactive")
      .map((r) => ({ id: r.id, name: String(r.fields[F.pName]).trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return json({ ok: true, preparers: list }, 200, { "Cache-Control": "public, max-age=300" });
  } catch (err) {
    console.error("preparers", err.message);
    return json({ ok: true, preparers: [] });
  }
};

export const config = { path: "/api/preparers" };
