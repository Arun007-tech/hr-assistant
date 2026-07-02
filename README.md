# HR Assistant

A single-user, iPad-first web app for a technical recruiter. Paste a JD to get an
ideal-candidate profile and Boolean search strings for LinkedIn/Naukri/Apna; paste or
upload resumes to get AI fit scores, gap analysis, and tailored screening questions;
track candidates through sourced → screening → shortlisted/rejected.

Runs entirely on free tiers: **Vercel Hobby** (Next.js), **Supabase free** (Postgres),
**Gemini via Google AI Studio** (AI).

## How it's wired

- All AI (Gemini) and database (Supabase) calls happen in server routes — no keys
  ever reach the browser. Candidate emails/phones are stripped before text is sent
  to the AI ([lib/redact.ts](lib/redact.ts)); the full text stays in your database.
- Auth is a single-PIN gate: `APP_PIN` env var → signed 30-day cookie
  ([proxy.ts](proxy.ts), [app/api/auth/route.ts](app/api/auth/route.ts)).
- Prompts and response schemas live in [lib/prompts.ts](lib/prompts.ts).

## One-time setup (~30-45 min)

**1. GitHub** — create a private repo and push this project to it.

**2. Google AI Studio** — go to [aistudio.google.com](https://aistudio.google.com)
→ *Get API key* → create a key. No billing setup needed (do **not** use
Vertex AI / Google Cloud Console). Note: on the free tier Google may use inputs to
improve its products — contact details are redacted before anything is sent.

**3. Supabase** — [supabase.com](https://supabase.com) → *New project* (free plan,
region `ap-south-1` Mumbai) → SQL Editor → run [supabase/schema.sql](supabase/schema.sql)
→ Project Settings → API → copy the **Project URL** and **service_role** key.

**4. Vercel** — [vercel.com](https://vercel.com) → sign up with GitHub → *Import*
the repo → add Environment Variables:

| Variable | Value |
| --- | --- |
| `APP_PIN` | a long passphrase you'll remember (not 4 digits) |
| `SESSION_SECRET` | output of `openssl rand -base64 32` |
| `GEMINI_API_KEY` | from step 2 |
| `GEMINI_MODEL` | `gemini-2.5-flash` (switch to `gemini-2.5-flash-lite` if you hit daily limits) |
| `SUPABASE_URL` | from step 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 3 |

→ Deploy.

**5. iPad** — open the `*.vercel.app` URL in Safari → Share → **Add to Home Screen**.

## Local development

```bash
cp .env.example .env.local   # fill in the same values
npm install
npm run dev
```

## Free-tier gotchas

- **Supabase pauses after ~7 days of inactivity** — unpause from the dashboard, or
  use the app at least weekly. No automatic backups on free tier: occasionally
  export the tables as CSV from the dashboard.
- **Gemini free tier** has per-minute and per-day request caps. The app shows a
  friendly retry message on 429s; a heavy sourcing day may brush the daily cap.
- **Vercel Hobby is for non-commercial use** — fine for a personal tool.
- Uploads are capped at 4MB (Vercel request-body limit is ~4.5MB).
