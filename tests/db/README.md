# Database lifecycle tests

Runs the real SQL functions (`create_tenant_with_room`, `create_bill_with_items`, `update_bill_status`,
`set_tenant_move_out_notice`, `cancel_tenant_move_out`, `complete_tenant_move_out`, `check_slip_upload_rate`, ...)
against an in-memory Postgres ([PGlite](https://pglite.dev)) loaded from `baseline.sql`, a schema-only snapshot of
the production `public` schema. Nothing touches Supabase when the tests run.

| File | Stage |
| --- | --- |
| `1-tenancy.test.ts` | start of a tenancy: room, tenant, contract, constraints |
| `2-billing.test.ts` | monthly bills, totals trigger, duplicate months, meters |
| `3-payment.test.ts` | public bill page, slip submission steps, upload rate limit, status changes |
| `4-moveout.test.ts` | move-out notice, rent waiver, cancel, complete |
| `5-lifecycle.test.ts` | re-letting a room, mid-month changeover, one test that walks the whole lifecycle |
| `6-clear-room.test.ts` | the hand-run script that clears one room's test data (`supabase/scripts/clear-room-data.sql`) |
| `7-settlement.test.ts` | deposit settlement after move-out: deductions, refund, closing, reopening |

Run: `npx vitest run tests/db` (about 6 s; `npm test` includes it).

Known bugs are kept as `it.fails("BUG: ...")` with a `// BUG (severity)` comment: the suite stays green, and the
test starts failing the day the bug is fixed, which is the cue to turn it into a normal test.

Migrations newer than `baseline.sql` are applied by `helpers.ts` (`pendingMigrations`) until the baseline is regenerated.

## Keeping the baseline current
After a migration is applied to the project, regenerate the snapshot (read-only catalog queries through the linked
Supabase CLI) and commit the diff:

```bash
node tests/db/generate-baseline.mjs
```

## Limits
RLS policies and storage are not modelled (tests run as a superuser with a stubbed `auth.uid()`), and the API routes
and React forms that call these functions are not exercised here.
