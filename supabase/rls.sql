-- =====================================================================
-- Taiko Quest NATC Phoenix 2025 — RLS POLICIES
-- Re-runnable: drops then recreates. Run AFTER schema.sql
-- =====================================================================

-- ---------- DROP existing policies (safe to re-run) ----------
drop policy if exists profiles_read_self_or_admin        on public.profiles;
drop policy if exists profiles_insert_self               on public.profiles;
drop policy if exists profiles_update_self_unapproved    on public.profiles;
drop policy if exists profiles_update_admin              on public.profiles;

drop policy if exists registrations_public_insert        on public.registrations;
drop policy if exists registrations_read_self_or_admin   on public.registrations;
drop policy if exists registrations_update_admin         on public.registrations;

drop policy if exists admins_read_admins                 on public.admins;
drop policy if exists admins_manage_admins               on public.admins;

drop policy if exists volunteers_read_self_or_admin      on public.volunteers;
drop policy if exists volunteers_manage_admin            on public.volunteers;

drop policy if exists questions_read_active              on public.questions;
drop policy if exists questions_manage_admin             on public.questions;

drop policy if exists boards_read_self_or_admin          on public.quest_boards;
drop policy if exists boards_insert_self                 on public.quest_boards;
drop policy if exists boards_update_self                 on public.quest_boards;
drop policy if exists boards_admin_update                on public.quest_boards;
drop policy if exists boards_admin_delete                on public.quest_boards;

drop policy if exists items_read_self_or_admin           on public.board_items;
drop policy if exists items_insert_self                  on public.board_items;
drop policy if exists items_update_self_no_verify        on public.board_items;
drop policy if exists items_update_admin_verify          on public.board_items;
drop policy if exists items_delete_self_or_admin         on public.board_items;

-- ---------- Enable RLS on all tables ----------
alter table public.profiles      enable row level security;
alter table public.registrations enable row level security;
alter table public.admins        enable row level security;
alter table public.volunteers    enable row level security;
alter table public.questions     enable row level security;
alter table public.quest_boards  enable row level security;
alter table public.board_items   enable row level security;

-- ---------- PROFILES ----------
-- Read: self or admin
create policy profiles_read_self_or_admin
on public.profiles for select
using (
  id = auth.uid()
  or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

-- Insert: self (used by client upsert)
create policy profiles_insert_self
on public.profiles for insert
with check ( id = auth.uid() );

-- Update by self: only while NOT approved (so they can set consent/display_name first)
create policy profiles_update_self_unapproved
on public.profiles for update
using ( id = auth.uid() )
with check ( id = auth.uid() and approved = false );

-- Update by admin: full control
create policy profiles_update_admin
on public.profiles for update
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
with check ( true );

-- ---------- REGISTRATIONS ----------
-- Insert: allow anyone (anon or authenticated) to submit a request
create policy registrations_public_insert
on public.registrations for insert
to anon, authenticated
with check ( status = 'pending' and approved_at is null );

-- Read: the logged-in user can read their own by email; admins can read all
create policy registrations_read_self_or_admin
on public.registrations for select
using (
  email = (auth.jwt() ->> 'email')
  or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

-- Update: admin only (approve/reject)
create policy registrations_update_admin
on public.registrations for update
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
with check ( true );

-- ---------- ADMINS ----------
-- Read: admins can see list
create policy admins_read_admins
on public.admins for select
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) );

-- Manage: admins can add/remove admins
create policy admins_manage_admins
on public.admins for all
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
with check ( exists (select 1 from public.admins a where a.user_id = auth.uid()) );

-- ---------- VOLUNTEERS ----------
-- Read: self or admin
create policy volunteers_read_self_or_admin
on public.volunteers for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

-- Manage: admins only
create policy volunteers_manage_admin
on public.volunteers for all
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
with check ( exists (select 1 from public.admins a where a.user_id = auth.uid()) );

-- ---------- QUESTIONS ----------
-- Read: any signed-in user; only active
create policy questions_read_active
on public.questions for select
using ( auth.uid() is not null and active = true );

-- Manage: admins only
create policy questions_manage_admin
on public.questions for all
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
with check ( exists (select 1 from public.admins a where a.user_id = auth.uid()) );

-- ---------- QUEST BOARDS ----------
-- Read: self or admin
create policy boards_read_self_or_admin
on public.quest_boards for select
using (
  user_id = auth.uid()
  or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

-- Insert: self
create policy boards_insert_self
on public.quest_boards for insert
with check ( user_id = auth.uid() );

-- Update: self
create policy boards_update_self
on public.quest_boards for update
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

-- Update/Delete: admin
create policy boards_admin_update
on public.quest_boards for update
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
with check ( true );

create policy boards_admin_delete
on public.quest_boards for delete
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) );

-- ---------- BOARD ITEMS ----------
-- Read: owner (via board) or admin
create policy items_read_self_or_admin
on public.board_items for select
using (
  board_id in (select id from public.quest_boards where user_id = auth.uid())
  or exists (select 1 from public.admins a where a.user_id = auth.uid())
);

-- Insert: owner only (and cannot preset verification fields)
create policy items_insert_self
on public.board_items for insert
with check (
  board_id in (select id from public.quest_boards where user_id = auth.uid())
  and verified = false
  and verified_at is null
  and verified_by is null
);

-- Update by owner: allowed, but may NOT set verification fields
create policy items_update_self_no_verify
on public.board_items for update
using (
  board_id in (select id from public.quest_boards where user_id = auth.uid())
)
with check (
  board_id in (select id from public.quest_boards where user_id = auth.uid())
  and verified = false
  and verified_at is null
  and verified_by is null
);

-- Update by admin: can verify items
create policy items_update_admin_verify
on public.board_items for update
using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
with check ( true );

-- Delete: owner or admin
create policy items_delete_self_or_admin
on public.board_items for delete
using (
  board_id in (select id from public.quest_boards where user_id = auth.uid())
  or exists (select 1 from public.admins a where a.user_id = auth.uid())
);