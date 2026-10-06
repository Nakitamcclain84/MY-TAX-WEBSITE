// POST /api/portal/logout  - clears the sign-in cookie.
import { json, sessionCookie } from "../lib/core.mjs";

export default async () => json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });

export const config = { path: "/api/portal/logout" };
