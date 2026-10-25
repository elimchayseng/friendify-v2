# Deploying the iPod collection

This replaces the frontend using the existing React/Vite build, Supabase project, Spotify OAuth integration, and Vercel routes. Existing user, track, and reaction data is retained. It adds the `ipod_preferences` table; account choice saving requires the new migration.

## Before production

1. Create a Vercel preview using a staging Supabase project. Apply `supabase/migrations/20261025000000_create_ipod_preferences.sql` to that project. The migration is additive and can be applied before the frontend deployment; it does not rewrite existing user or music data. Do not reset an existing database.
2. Set frontend build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Preserve the existing server variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `CRON_SECRET`. Server secrets must not use a `VITE_` prefix. Configure preview and production environments separately.
3. Allow the deployed origin in Supabase Auth redirect URLs. Keep the Spotify application's Supabase OAuth callback URL. Test an existing account and a new account against the deployed origin, including reload, logout, track loading, image loading, saved model/finish, and visibility from a second account.
4. Run `supabase/checks/deployment_readiness.sql` in the production SQL editor and review its results. The repository contains an older migration that disables RLS on `users`, `tracks`, and `user_tracks`; `users` contains Spotify access and refresh tokens. The actual production policies have not been inspected. Confirm that anonymous users and other accounts cannot read credentials or modify another user's profile. The new iPod table has its own ownership policies, but does not change those existing tables.
5. Verify the scheduled refresh endpoint in staging with configured server variables. This change removes token/request/secret logging and rejects all cron requests when `CRON_SECRET` is missing. Never use `Bearer undefined` as a substitute.
6. Review the dependency audit before production. The local audit on 2026-10-25 reports 28 advisories in the existing dependency tree, including critical findings for development-only `form-data` and Express’s transitive `proxy-addr`. Assess the deployed runtime exposure and patch the affected dependencies. This UI PR does not apply broad dependency upgrades.
7. Check floating/spinning devices on actual desktop and phone hardware. The 3D code is lazy loaded and motion respects reduced-motion preferences; local browser rendering is not a substitute for a device-performance check.

## Validation performed locally

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. The test suite executes PostgreSQL policies through PGlite and checks cron authorization without external requests.
- Browser inspection at desktop, tablet, and phone sizes; keyboard navigation, dialog focus, reduced motion, model previews, album artwork, zoom/pan/pinch, and WebGL failure recovery.
- Account save, reload, cancel, failed-save retry, and delayed-preference loading using isolated mock Supabase/Spotify responses.
- PostgreSQL execution of the migration with distinct authentication and profile UUIDs, including valid owner writes, rejected cross-account writes, finish constraints, anonymous read-only access, and profile deletion cleanup.
- Cron authentication checks with configured/missing secrets using fake local environment values and no external API requests.

No production database migration, real OAuth login, scheduled refresh, or production deployment was performed from this workspace.

## Rollback

Redeploy the previous frontend if needed. Keep the additive preferences table and its data; the previous app does not depend on it. Database security remediation should be reviewed separately rather than reverting policies to a less restrictive state.
