-- Optioneel e-mailadres per locatie (planning naar locatie). Voer uit in Supabase SQL Editor.

alter table public.spl_locations
  add column if not exists email text;
