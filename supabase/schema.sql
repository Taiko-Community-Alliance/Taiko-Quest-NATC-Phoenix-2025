-- =====================================================================
-- Taiko Quest NATC Phoenix 2025 — SCHEMA (tables, constraints, indexes)
-- Re-runnable / idempotent. Run BEFORE rls.sql
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- PROFILES (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique,
  display_name text,
  consent      boolean not null default false,
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- REGISTRATIONS (attendee requests → admin approves)
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  first_name   text not null,
  last_name    text not null,
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now(),
  approved_at  timestamptz
);
create index if not exists idx_registrations_status_created
  on public.registrations (status, created_at desc);

-- ---------------------------------------------------------------------
-- ADMINS (who can access admin UI & verify)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- VOLUNTEERS (optional: Day 0 or special badges)
-- ---------------------------------------------------------------------
create table if not exists public.volunteers (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- QUESTIONS (pool to draw from)
-- category doubles as “track”: shimedaiko | odaiko | chudaiko | okedo | volunteer
-- level: integer 1..4  (1 easy … 4 expert)
-- ---------------------------------------------------------------------
create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  text       text not null,
  category   text not null,
  level      integer not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint questions_level_range check (level between 1 and 4)
);
create index if not exists idx_questions_active_cat_level
  on public.questions (active, lower(category), level);

-- ---------------------------------------------------------------------
-- QUEST BOARDS (one board per user per day; 0 = volunteers day)
-- ---------------------------------------------------------------------
create table if not exists public.quest_boards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day_no     int  not null,
  status     text not null default 'open'
             check (status in ('open','completed','archived')),
  created_at timestamptz not null default now(),
  constraint quest_boards_day_no_check check (day_no between 0 and 31),
  constraint uq_board_per_user_per_day unique (user_id, day_no)
);
create index if not exists idx_boards_user_day on public.quest_boards(user_id, day_no);

-- ---------------------------------------------------------------------
-- BOARD ITEMS (4 + 1 bonus items per (board, track))
-- proof_url → Storage (bucket 'proofs')
-- ---------------------------------------------------------------------
create table if not exists public.board_items (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references public.quest_boards(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete restrict,
  track        text not null,
  is_bonus     boolean not null default false,
  proof_url    text,
  submitted_at timestamptz,
  verified     boolean not null default false,
  verified_at  timestamptz,
  verified_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint uq_item_per_board_track_question unique (board_id, track, question_id)
);
create index if not exists idx_items_board on public.board_items(board_id);
create index if not exists idx_items_board_track on public.board_items(board_id, lower(track));
create index if not exists idx_items_verified on public.board_items(verified, verified_at);

-- =====================================================================
-- (Optional) quick seeds to test — uncomment/edit as needed
-- =====================================================================
-- -- insert into public.admins(user_id) values ('00000000-0000-0000-0000-000000000000')
-- -- on conflict do nothing;

-- -- insert into public.questions (text, category, level) values
-- -- ('Snap a shime at Stage A','shimedaiko',1),
-- -- ('Meet an odaiko player','odaiko',2),
-- -- ('Record a chudaiko solo','chudaiko',2),
-- -- ('Spot an okedo variation','okedo',3),
-- -- ('Volunteer briefing photo','volunteer',4)
-- -- on conflict do nothing;