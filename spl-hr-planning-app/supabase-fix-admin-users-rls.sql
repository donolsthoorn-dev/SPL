-- Eenmalig uitvoeren in Supabase SQL Editor als je al de oude policy had.
-- Oorzaak: policy met "exists (select ... from admin_users)" blokkeert door geneste RLS.

drop policy if exists "Admins can read admin_users" on public.admin_users;

create policy "Users read own admin row"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());
