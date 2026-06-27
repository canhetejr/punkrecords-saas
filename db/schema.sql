
create extension if not exists pgcrypto;

create table if not exists public.punk_saas_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.punk_saas_agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.punk_saas_orgs(id) on delete cascade,
  name text not null,
  role text not null default 'agent',
  status text not null default 'idle',
  model text,
  avatar text,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(org_id, name)
);

create table if not exists public.punk_saas_boards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.punk_saas_orgs(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique(org_id, slug)
);

create table if not exists public.punk_saas_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.punk_saas_boards(id) on delete cascade,
  name text not null,
  position int not null default 0,
  accent text not null default '#fff',
  created_at timestamptz not null default now(),
  unique(board_id, name)
);

create table if not exists public.punk_saas_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.punk_saas_boards(id) on delete cascade,
  column_id uuid references public.punk_saas_columns(id) on delete set null,
  assignee_agent_id uuid references public.punk_saas_agents(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium',
  status text not null default 'open',
  position int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.punk_saas_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.punk_saas_orgs(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique(org_id, slug)
);

create table if not exists public.punk_saas_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.punk_saas_chat_rooms(id) on delete cascade,
  agent_id uuid references public.punk_saas_agents(id) on delete set null,
  author_name text not null,
  body text not null,
  kind text not null default 'chat',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.punk_saas_mcp_clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.punk_saas_orgs(id) on delete cascade,
  client_name text not null,
  capabilities jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(org_id, client_name)
);

create table if not exists public.punk_saas_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.punk_saas_orgs(id) on delete cascade,
  actor text,
  event_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.punk_saas_orgs(name, slug)
values ('Canhete Labs', 'canhete-labs')
on conflict (slug) do nothing;

with org as (select id from public.punk_saas_orgs where slug='canhete-labs')
insert into public.punk_saas_boards(org_id, name, slug)
select id, 'PunkRecords Command Board', 'command-board' from org
on conflict (org_id, slug) do nothing;

with board as (select id from public.punk_saas_boards where slug='command-board')
insert into public.punk_saas_columns(board_id, name, position, accent)
select id, x.name, x.position, x.accent
from board, (values
  ('Inbox',0,'#ffffff'),
  ('Planejado',1,'#d8d8d8'),
  ('Executando',2,'#a8a8a8'),
  ('Revisão',3,'#777777'),
  ('Feito',4,'#ffffff')
) as x(name, position, accent)
on conflict (board_id, name) do nothing;

with org as (select id from public.punk_saas_orgs where slug='canhete-labs')
insert into public.punk_saas_agents(org_id, name, role, status, model, avatar, metadata)
select id, x.name, x.role, x.status, x.model, x.avatar, x.metadata::jsonb
from org, (values
  ('TanIA','orchestrator','online','gpt-5.5','duck','{"signature":"black duck"}'),
  ('Builder','coding-agent','idle','autonomous','terminal','{}'),
  ('Reviewer','qa-agent','idle','analysis','check','{}'),
  ('Archivist','memory-agent','online','punkrecords','graph','{}')
) as x(name, role, status, model, avatar, metadata)
on conflict (org_id, name) do update set status=excluded.status, last_seen_at=now();

with org as (select id from public.punk_saas_orgs where slug='canhete-labs')
insert into public.punk_saas_chat_rooms(org_id, name, slug)
select id, 'War Room', 'war-room' from org
on conflict (org_id, slug) do nothing;

with board as (select id from public.punk_saas_boards where slug='command-board'),
cols as (select id, name from public.punk_saas_columns where board_id=(select id from board)),
ag as (select id, name from public.punk_saas_agents)
insert into public.punk_saas_cards(board_id, column_id, assignee_agent_id, title, description, priority, position, metadata)
select (select id from board), (select id from cols where name='Executando'), (select id from ag where name='TanIA'),
  'Publicar PunkRecords SaaS', 'Next.js + Supabase + MCP + Kanban + Chat em punkrecords.canhete.com', 'high', 0, '{"source":"seed"}'::jsonb
where not exists (select 1 from public.punk_saas_cards where title='Publicar PunkRecords SaaS');

with room as (select id from public.punk_saas_chat_rooms where slug='war-room'),
ag as (select id from public.punk_saas_agents where name='TanIA')
insert into public.punk_saas_messages(room_id, agent_id, author_name, body, kind, metadata)
select room.id, ag.id, 'TanIA', 'PunkRecords SaaS inicializado: kanban, chat e MCP online.', 'system', '{"source":"seed"}'::jsonb
from room, ag
where not exists (select 1 from public.punk_saas_messages where body='PunkRecords SaaS inicializado: kanban, chat e MCP online.');
