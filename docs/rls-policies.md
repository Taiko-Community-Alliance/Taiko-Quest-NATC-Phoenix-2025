# Row-Level Security (RLS) – How it works for Taiko Quest

**Goal:** Attendees see only their own data (after approval). Admins see everything.

## registrations (request access form)
- **Anon:** may **insert** a registration (first, last, email).
- **Signed-in user:** may **read only their own** registration (match on login email).
- **Admin:** may **read/update all** registrations.

## profiles (account record after login)
- **User:** may **read/update own** profile.
- **Admin:** may **read/update all** profiles.

## questions (prompt pool)
- **Any signed-in user:** may **read** questions.
- **Admin:** may **write** (add/retire).

## quest_boards (one per user)
- **User:** may **read/update own** board **only if approved**.
- **Admin:** may **read/update all** boards.

## board_items (25 squares per board)
- **User:** may **read/update own** items **only if approved** (attach proof URLs).
- **Admin:** may **read/update all** items. Only **admins** can set `verified=true`.

## storage: bucket `proofs`
- **Public read** (thumbnails load easily), **authenticated write**.
- Optional: path limit to `proofs/{auth.uid()}/…`.
