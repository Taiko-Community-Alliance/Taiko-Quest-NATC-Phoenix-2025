# Database Schema (Taiko Quest NATC 2025)

**Last updated:** August 18, 2025

This document defines the canonical schema for the taiko quest app. It includes columns, relationships, and a few example queries.

## Entities & Relationships (overview)

- **registrations** → pre-auth sign-ups (**pending/approved/rejected**)
- **profiles** → 1 row per authenticated user (maps to **auth.uid()**)
- **questions** → quest prompt pool (**active** flags)
- **quest_boards** → 1 per approved, consented user
- **board_items** → 25 per board, each links to a **question** and optional **proof_url**


## Tables

### registrations
- **Purpose:** Store attendee requests before sign-in.
- **Columns:**
  - `id uuid` **pk**
  - `email text` **unique, required**
  - `first_name text` **required**
  - `last_name text` **required**
  - `status text` **default 'pending'**  (values: **pending**, **approved**, **rejected**)
  - `created_at timestamptz` **default now()**
  - `approved_at timestamptz`
- **Indexes:** `status`
- **Notes:** Keep **one row per email**.

### profiles
- **Purpose:** Post-auth user record; mirrors approval + consent.
- **Columns:**
  - `id uuid` **pk = auth.uid()**
  - `email text` **unique**
  - `display_name text`
  - `role text` **default 'attendee'** (values: **attendee**, **admin**)
  - `consent boolean` **default false**
  - `approved boolean` **default false**
  - `created_at timestamptz` **default now()**
- **Notes:** Admins typically have **approved=true** for testing.

### questions
- **Purpose:** Prompt pool for boards.
- **Columns:**
  - `id uuid` **pk**
  - `text text` **required**
  - `active boolean` **default true**
  - `category text` *(optional)*
  - `weight int` **default 1** *(future: weighted picks)*
- **Notes:** Use **active=false** to retire prompts live.

### quest_boards
- **Purpose:** One board per user.
- **Columns:**
  - `id uuid` **pk**
  - `user_id uuid` **fk → profiles(id) ON DELETE CASCADE**
  - `created_at timestamptz` **default now()**
- **Notes:** Create **only after** `profiles.approved=true` **and** `profiles.consent=true`.

### board_items
- **Purpose:** 25 items per board.
- **Columns:**
  - `id uuid` **pk**
  - `board_id uuid` **fk → quest_boards(id) ON DELETE CASCADE**
  - `question_id uuid` **fk → questions(id)**
  - `proof_url text` *(public URL to Storage or Drive)*
  - `verified boolean` **default false** *(admin only)*
- **Notes:** Trigger prevents non-admins from setting `verified=true`.

## DDL Reference (condensed)

```sql
-- See repo /db/migrations for authoritative SQL
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text not null,
  last_name text not null,
  status text not null default 'pending',
  created_at timestamptz default now(),
  approved_at timestamptz
);

create table if not exists profiles (
  id uuid primary key,
  email text unique,
  display_name text,
  role text default 'attendee',
  consent boolean default false,
  approved boolean default false,
  created_at timestamptz default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  active boolean not null default true,
  category text,
  weight int default 1
);

create table if not exists quest_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists board_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references quest_boards(id) on delete cascade,
  question_id uuid not null references questions(id),
  proof_url text,
  verified boolean default false
);

create index if not exists idx_registrations_status on registrations(status);
create index if not exists idx_board_items_board_id on board_items(board_id);
