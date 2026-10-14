# Home39 Manager

ระบบจัดการหอพัก Home 39 (หาดใหญ่): หน้าเว็บสาธารณะสำหรับดูห้องว่าง และหลังบ้านสำหรับผู้ดูแลจัดการห้อง ผู้เช่า สัญญา บิลรายเดือน ค่าใช้จ่าย และการแจ้งเตือนผ่าน LINE

Stack: Next.js 15 (App Router), React 19, Tailwind CSS 4, Supabase (Postgres, Auth, Storage), LINE Messaging API

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values (see Production setup)
npm run dev                  # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npx tsc --noEmit` | Type check |
| `npm run gen:types` | Regenerate `src/lib/supabase/database.types.ts` from the linked Supabase project (run after every migration) |

CI runs lint, type check, and tests on every pull request.

## Project layout

```text
src/
  app/
    page.tsx, HomePage.tsx, _components/home/   Public homepage
    login/                                      Admin sign-in
    dashboard/                                  Monthly overview (+ _components/)
    rooms/[roomCode]/                           Room, tenant, contract, bills
    expenses/                                   Monthly expenses
    settings/{homepage,payment}/                Homepage content and payment info
    pay/[token]/                                Public bill page and slip upload
    api/                                        Bills, LINE webhook, cron, slips, move-out
  components/                                   Shared UI (AdminShell, HomepageImage, ...)
  lib/
    format.ts, billStatus.ts, billing.ts        Pure helpers (tested)
    dashboard.ts                                Monthly summary calculation (tested)
    data/                                       Supabase data access (session, dashboard)
    supabase/                                   Browser, server, admin and public clients
    line.ts, image.ts, homepage.ts              LINE, HEIC conversion, homepage content
supabase/migrations/                            Database schema changes
```

Conventions:

- Private route folders use an `_components` directory next to the page that owns them.
- Pages under the admin area call `requireUser()` from `src/lib/data/session.ts`; API routes return 401 JSON instead of redirecting.
- Dates are stored as `YYYY-MM-DD` and displayed in the Buddhist era via `src/lib/format.ts`.
- Water (150 baht/person) and electricity (7 baht/unit) rates live in `src/lib/billing.ts`.

## Production setup

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-production-domain
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
CRON_SECRET=
```

After pulling the latest branch, apply database changes:

```bash
npx supabase db push --dry-run
npx supabase db push
```

Configure the LINE Messaging API webhook URL as:

```text
https://your-production-domain/api/line/webhook
```

Enable webhooks in LINE Developers. Keep the Channel Secret, Channel Access Token, and Supabase service role key only in the hosting provider's server environment; never expose them in browser code or commit them to Git.

To link a tenant, open the room page, create a one-time LINE code, and ask the tenant to send the complete `HOME39 ...` message to the official account within 15 minutes. New bills are sent automatically when LINE is linked, and can also be sent again from the bill detail page.

Vercel runs `/api/cron/bill-reminders` every day at 08:00 Thailand time. Set `CRON_SECRET` to a long random value so only the scheduler can call this endpoint. The job sends one reminder three days before the due date and one overdue notification after the due date.
