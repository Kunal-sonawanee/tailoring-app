# Tailoring App (The Stitch Art) — Claude Code context

Read this first, every session. Full requirements: `docs/SPEC.md`.

## What this is
A mobile-first web app (PWA) that replaces the paper registers of a small ladies' tailoring shop, **The Stitch Art** (Nashik). It stores customers, measurements, orders, design sketches, fabric photos and due dates, and warns the owner before delivery dates are missed.

- **Client / only user (V1):** the shop owner. Non-technical, uses an Android phone, reads Marathi best.
- **Builder:** Kanthya (Kantex Technologies), a solo founder. Explain decisions simply and briefly.
- **Business plan:** 15–20 day free trial for The Stitch Art → paid plan → later a multi-shop SaaS for other tailors. So build **multi-tenant from day 1**.

## Stack (fixed — don't change without asking)
- **Frontend:** Vite + React + TypeScript + Tailwind CSS, installable PWA (`vite-plugin-pwa`)
- **Backend:** one Cloudflare **Worker** with static assets (serves the React build + `/api/*`), router: **Hono**
- **Database:** Cloudflare **D1** (SQLite). Migrations in `migrations/` via `wrangler d1 migrations`
- **Files:** Cloudflare **R2**, private bucket, served only through the Worker after auth check
- **Drawing:** `perfect-freehand` on an SVG canvas
- **Image compression:** in the browser before upload (canvas → WebP), see SPEC §7
- **Excel export:** `xlsx` (SheetJS), client-side
- **Deploy:** `wrangler deploy` (later: GitHub Actions on push to `main`)

## Hard rules
1. **₹0 running cost.** Stay inside Cloudflare's free tier. Don't add any paid service or third-party API without asking.
2. **Every table has `shop_id`.** Every query filters by the logged-in user's `shop_id`. No exceptions.
3. **No hardcoded UI text.** All strings go through i18n (`src/i18n/mr.json`, `hi.json`, `en.json`). Default language: **Marathi (`mr`)**. Digits always English (0–9).
4. **Mobile first:** design for 360 px width, touch targets ≥ 48 px, body text ≥ 16 px, form labels ≥ 18 px.
5. **Measurements use a numeric keypad** (`inputmode="decimal"`), unit = inches, step 0.25.
6. **Never hard-delete** customers, orders or photos. Use `deleted_at` (soft delete).
7. **Dates:** shown as DD/MM/YYYY, all "today/overdue" logic in **Asia/Kolkata** time.
8. **Keep it simple.** Fewer screens, bigger buttons, fewer fields. If a feature isn't in SPEC.md, ask before building it.
9. Keep dependencies minimal. Don't add a UI component library; use Tailwind.

## How we work
- Build **phase by phase** following `docs/SPEC.md` §12. Finish one phase, deploy it, let Kanthya test on a phone, then move on.
- At the end of each phase: tick the checklist in SPEC §12 and add a 2–3 line note to `docs/CHANGELOG.md`.
- Items marked **[CONFIRM]** in SPEC are assumptions waiting for the shop's register photos. Build them as config/seed data so they're easy to change.

## Commands
- `npm run dev` — local dev: Vite + the Worker (via `@cloudflare/vite-plugin`) with local D1/R2 on one port
- `npm run build` — i18n key check → typecheck → build frontend + Worker into `dist/`
- `npm run preview` — build, then serve the production build locally
- `npm run i18n:check` — check mr/hi/en have the same keys
- `npm run cf-typegen` — regenerate `worker/worker-configuration.d.ts` after changing `wrangler.toml`
- `npm run db:migrate:local` / `npm run db:migrate:remote`
- **Deploy:** push to `main` → `.github/workflows/deploy.yml` applies D1 migrations and runs `wrangler deploy` (repo secret `CLOUDFLARE_API_TOKEN`). Manual: `npm run deploy` from a machine with a Cloudflare login. Deploying from a Claude cloud session fails: the proxy replaces the asset-upload key.

## Layout
- `src/` React app · `src/i18n/` strings + `useI18n()` · `src/lib/dates.ts` IST/date helpers
- `worker/index.ts` Hono API (`/api/*` only; all other paths are static assets)
- `migrations/` D1 SQL · `public/icons/` PWA icons (`icon.svg` is the source)
- Cloudflare: D1 `tailoring-db` (id in `wrangler.toml`, APAC), R2 `tailoring-files` (binding `FILES`)
