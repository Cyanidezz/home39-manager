# Visual QA: screenshots of signed-in pages without a real backend

Runs the **real app** against a tiny fake Supabase (`mock-supabase.mjs`, fake data in `fixtures.mjs`)
and captures full-page screenshots with the system Chrome (headless, throwaway profile).
It exists so UI reviews can see admin pages without credentials or a test database.

- Nothing here talks to production: the app is started with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`.
- The mock is read-only (writes are accepted and ignored), accepts any login, and serves invented data.
- Layout and CSS are real; numbers, names and photos are not. Pages that need storage (signed slip/contract URLs, photos) show their empty states.

## Run

```bash
# terminal 1 (repo root)
node tools/visual-qa/mock-supabase.mjs 54321

# terminal 2 (repo root)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=mock SUPABASE_SERVICE_ROLE_KEY=mock \
npm run dev -- -p 3991

# terminal 3: install once with `cd tools/visual-qa && npm install`
node tools/visual-qa/screenshot.mjs <outDir> [all|/path,/path] [desktop|mobile|both]
```

Defaults: all main pages, desktop (1280px) and mobile (390px @2x). Set `CHROME_PATH` / `APP_URL` to override.
The script signs in through the real `/login` form first, so the login flow is exercised too.

## Limits
- The mock understands only the PostgREST features the app uses (select with embedded relations, eq/neq/in/is/not, order, limit, single). If a page starts using something new, extend `query()` in `mock-supabase.mjs`.
- Screenshots come from Chrome with an English locale, so native widgets (e.g. the month picker) show English text.
- The Next.js dev badge may appear in the corner; ignore it.

## Phone overflow check
On the mobile viewport the script also prints `! overflow <page>` when a page is wider than the screen, with the first elements sticking out.
It runs in Chrome's phone emulation, not iOS Safari: iOS also gives date/month inputs their own width, which `globals.css` neutralises, so check those pages on a real iPhone too.
