-- Eenmalig: markeer wat al verstuurd is via Resend op 2026-05-29 (week 2026-06-01 / week 23).
-- Voer uit NA supabase-planning-email-queue.sql
-- Daarna in de app: "Alleen gemiste e-mails" voor medewerkers (39 stuks).

insert into public.spl_planning_email_deliveries (week_start, audience, recipient_id, email)
select
  '2026-06-01'::date,
  'employee',
  e.id,
  coalesce(
    nullif(
      case when e.planning_email_is_private is not false then trim(e.private_email) else trim(e.email) end,
      ''
    ),
    trim(e.email)
  )
from public.spl_employees e
where e.id in (
  '237166c9-408e-4059-8b6a-88e91553cc6d',
  'a7e15992-ed36-4a02-8e8d-4f05ff4a973f',
  '94b41e7f-4c70-4c04-9da0-7cbabec5bdf1',
  '267367c5-0b19-4b82-a774-c2a101f843ab',
  '302f1a93-8dc7-4973-8493-bfbdf8e7aae1',
  'fe7f1982-b93e-4840-a745-bcf4d14530c2',
  'ced50b90-4cc0-4114-ba3c-0946f991433a',
  'df2a7b08-29dd-4df1-9b1a-e8cd4773f753',
  '7d9ef745-6318-4577-84ff-45dad2873cec',
  '76881a5d-da91-4d2d-abbd-1f28b7461079',
  '17bfb5d8-b606-4266-94eb-fa86ce5c7824',
  'effe3ab9-f11e-4510-88ad-dde4925911be',
  'ad9f4e6c-288f-44b9-a41f-cacd0a73834f',
  'fc2dd5fc-6e86-466f-9d7b-3bb53ba900b8',
  'bd9e8230-c7ef-4501-bb64-d1e2ce436a64',
  'd1b6d2e9-6adf-4bff-a06e-79dd53d02202',
  'f09e7288-d2e6-4dac-9bfc-fbd76886c0e3',
  'fec7f92f-2f53-4095-a2e9-074ddcc47e1d',
  'f4fa521a-7808-4e6a-9e48-fc492d332a58',
  '6ce0b140-c725-4a3b-9bb8-38f2b80deb2a',
  'd483f5e0-9d9f-4c85-93f0-e309c65ae7fd',
  'a905283b-19a9-469c-831b-0ad669d5b7ec',
  '7f223120-fc77-4ac1-bb4b-76901072452d',
  '336e5173-db13-43e3-a65a-29bdec9179fc',
  'e13c53f1-36ff-4936-aac5-1605a41be74d',
  '1c27cf7d-a405-4101-90a3-9729502152a6',
  'a9a4885f-289c-4d5b-8a03-98aa59bcbea2',
  '5ef915eb-c9fb-4608-b59a-002e88eb75a1',
  'ab95b5a0-debd-40bc-b990-df056b6e9612',
  '2c604f74-e551-4195-9be2-3433e18b163f',
  '96dfc9a7-1a1b-420d-ae3f-a67ae9240f9c',
  '99d23941-4ce6-4c7f-8b61-91e2315281f0',
  '30b3a74a-1524-40d6-ad58-dfb670c2be54',
  '8b7838a3-11b6-4cf5-8a5f-e9f3527687b7',
  '1e93507f-8c2d-421c-a2dd-1b5f350491cd',
  '355df45b-2812-44b2-a6c2-29c67b64b8d3',
  '50529f27-5364-432b-acfe-334a1015eb98',
  '8b014d6e-01e3-4db6-aab7-96dbbf0e80cc',
  '30818279-f370-4b13-8242-2a9ce661a485',
  '3b7fea75-3a34-4eec-9f42-fb3181128ccb'
)
on conflict (week_start, audience, recipient_id) do nothing;

-- Locaties: 15 Resend-mails op 2026-05-29 (ids + e-mail zoals in Resend-export)
insert into public.spl_planning_email_deliveries (week_start, audience, recipient_id, email)
values
  ('2026-06-01', 'location', '3ef8fd7d-5bde-4891-829b-90ee0418f718', 'apollo@splopvang.nl'),
  ('2026-06-01', 'location', 'a93011bd-9a54-4ecb-995e-cc5f491340fa', 'pcmengelmoes@splopvang.nl'),
  ('2026-06-01', 'location', '2ae9b874-dc5e-413d-9865-02cc65938a77', 'ollekebolleke@splopvang.nl'),
  ('2026-06-01', 'location', 'd4765a82-fef5-450d-8483-06cfa710f5f7', 'pchetgebouwgg@splopvang.nl'),
  ('2026-06-01', 'location', 'e191fc22-ac9f-48ef-bf3f-e21699970cc0', 'pchetgebouwrb@splopvang.nl'),
  ('2026-06-01', 'location', '30034734-f3b2-476d-a69b-b313de1d5365', 'gebouw@splopvang.nl'),
  ('2026-06-01', 'location', 'dc62e05a-126b-4352-9648-c1035afd5c23', 'pcmerenwijk@splopvang.nl'),
  ('2026-06-01', 'location', '1da24edc-020d-4ea8-8bd4-a07f04e7af1b', 'pcmerenwijk@splopvang.nl'),
  ('2026-06-01', 'location', '933c9a8a-9586-4ad5-9166-61a63b5d6e71', 'groenknollenland@splopvang.nl'),
  ('2026-06-01', 'location', '2891f71c-1fea-483f-b6b0-42f49ca805df', 'otensien@splopvang.nl'),
  ('2026-06-01', 'location', '5c675e5a-48c8-4e04-9d76-826032113c6a', 'duintop@splopvang.nl'),
  ('2026-06-01', 'location', 'f0f20a68-3b3f-471e-90c4-5aafac6facea', 'pippeloenvoorschoten@splopvang.nl'),
  ('2026-06-01', 'location', '287f73b4-228e-483e-8a4c-8a706181eaf6', 'boerderij@splopvang.nl'),
  ('2026-06-01', 'location', '8233576c-24eb-4687-b53e-21e614720303', 'groeigroep@splopvang.nl'),
  ('2026-06-01', 'location', 'd6b25dd9-2e74-4b54-b4da-072fedbf94f2', 'boschfluiters@splopvang.nl')
on conflict (week_start, audience, recipient_id) do nothing;
