# Changelog

## 18 Nov 2026 — Phase 0 (setup)
- Scaffolded Vite + React + TS + Tailwind PWA, served by one Hono Worker; created D1 `tailoring-db` and R2 `tailoring-files`. i18n skeleton (mr default / hi / en) with a build-time key check; self-hosted Noto Sans Devanagari.
- Phase 0 screen checks API, database and photo storage, and shows today's date in IST. Tested at 360 px.
- Deploy runs from GitHub Actions on push to `main`. First deploy waits for the `CLOUDFLARE_API_TOKEN` repo secret.

## 18 Nov 2026
- Requirements written: `docs/SPEC.md` v0.1. Project context: `CLAUDE.md`. No code yet.
