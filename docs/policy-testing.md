# Policy Testing Guide (RLS + Storage)

**Last updated:** August 18, 2025

This checklist helps you confirm policies with real accounts or Supabase’s Policy Simulator.

## Roles to test
- **Anon** (not signed in)
- **Attendee (pending)**: registered but not approved
- **Attendee (approved)**: approved + consented
- **Admin**

## Expected outcomes

### registrations
- **Anon**: can **INSERT** only.
- **Attendee**: can **SELECT** their **own** row (email match).
- **Admin**: can **SELECT/UPDATE** all.

### profiles
- **Attendee/Admin**: can **INSERT/SELECT/UPDATE** own profile.
- **Admin**: can **SELECT/UPDATE** all.

### questions
- **Any signed-in user**: **SELECT** allowed.
- **Admin**: can write.

### quest_boards / board_items
- **Pending attendee**: **no read** (blocked) until `approved=true`.
- **Approved attendee**: can **SELECT/UPDATE** own board/items.
- **Admin**: **all** actions allowed.
- **Verified**: only admin can set `verified=true` (trigger enforces).

### storage (proofs)
- **Public**: can **read** files.
- **Authenticated**: can **insert/update** per policies; with path rule, only within their folder.

## Quick manual tests
- Log in as attendee, try to open another user’s board → **should 403**.
- Log in as attendee, try to set `verified=true` → **should fail** (trigger).
- Log in as admin, approve a registration → attendee can see their board next login.

## Troubleshooting
- **403 unexpected**: likely missing policy for that action/table.
- **Email mismatch**: ensure login email equals registration email.
- **Not approved**: `profiles.approved` must be true before reading boards/items.
- **Storage URLs**: confirm bucket id and object `name` path match policy.
