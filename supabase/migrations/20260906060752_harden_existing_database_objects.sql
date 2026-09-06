alter view public.bill_summary set (security_invoker = true);

alter function public.set_updated_at() set search_path = '';
alter function public.calculate_bill() set search_path = '';
