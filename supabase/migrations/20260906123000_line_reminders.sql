create table if not exists public.line_notification_logs (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  notification_type text not null check (notification_type in ('due_3_days', 'overdue')),
  sent_at timestamptz not null default now(),
  unique (bill_id, notification_type)
);

alter table public.line_notification_logs enable row level security;

drop policy if exists "Authenticated users can view LINE notification logs" on public.line_notification_logs;
create policy "Authenticated users can view LINE notification logs"
on public.line_notification_logs for select
to authenticated
using (true);

revoke all on table public.line_notification_logs from anon;
grant select on table public.line_notification_logs to authenticated;

create index if not exists line_notification_logs_bill_id_idx
  on public.line_notification_logs (bill_id);
