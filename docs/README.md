# NATC Phoenix 2025 Taiko Quest – Documentation

**Last updated:** August 13, 2025

Welcome to the documentation for the **NATC (North American Taiko Conference) Phoenix 2025 Taiko Quest** project.

## What’s here
- **quickstart.md** — fast local setup
- **deployment.md** — GitHub Pages deployment notes
- **admin-guide.md** — how admins review & verify submissions
- **rls-policies.md** — Row-Level Security examples
- **schema.md** — database tables and notes
- **faq.md** — attendee & operator FAQ
- **privacy-faq.md** — data handling & removals
- **accessibility.md** — accessibility approach
- **prompts-changelog.md** — log of prompt pool changes

**Project links**
- **Repo:** **https://github.com/Taiko-Community-Alliance/Taiko-Quest-NATC-Phoenix-2025**
- **Live site:** **https://taiko-community-alliance.github.io/taiko-quest-natc-phoenix-2025**
- **Contact:** **info@taikocommunityalliance.org**

## Licensing at a glance
- **Code:** **PolyForm Noncommercial 1.0.0** (see `LICENSE`)
- **Docs & prompts:** **CC BY 4.0** (see `LICENSE-docs`)
- **Brand assets:** **All Rights Reserved**
- **Attendee uploads:** **TERMS.md** (media consent)

## How to run in local machine (Ex in Ubuntu)
### Using node http-server
npx http-server docs -p 8000 -a 0.0.0.0 --cors

### Using Python 3
cd docs
python3 -m http.server 8000 --bind 0.0.0.0