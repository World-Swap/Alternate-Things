# Things — Alternate

A single-user personal task manager modeled on Things 3, built with **React + Vite + Tailwind CSS**.

It reconstructs the ideas that make Things work: a clean **Area → Project → To-do** hierarchy and a hard separation between *when you plan to work on something* (`When`) and *when it's actually due* (`Deadline`).

## The three core ideas

1. **"When" ≠ "Deadline."** Two independent fields on every to-do. *When* is your intention (Today / This Evening / a future date / Someday). *Deadline* is the immovable due date, rendered as a red flag with a day countdown.
2. **Areas vs Projects.** An **Area** is an ongoing sphere of responsibility (Work, Family, Hobbies) and never completes. A **Project** has a finite outcome and shows a progress ring.
3. **Capture first, organize later.** Everything drops into the **Inbox** with zero friction, then gets sorted afterward. The daily focus surface is **Today**.

## Smart lists (computed filters, not folders)

| List | Filter logic |
|---|---|
| **Inbox** | unassigned (no project/area) and unscheduled |
| **Today** | `when == today/evening` OR `deadline <= today`; split into **Today** and **This Evening** sections |
| **Upcoming** | future scheduled items + upcoming deadlines, grouped by date |
| **Anytime** | open, assigned to a project/area, not deferred to Someday |
| **Someday** | `when == someday` |
| **Logbook** | completed items, grouped by completion date |

## Features

- Floating **Magic Plus** button for quick capture (defaults new items into the current view).
- Checkbox completion that moves items into the Logbook.
- To-do detail editor: notes, checklist items, `When` picker, `Deadline` picker, `Reminder`, `Repeat`, list/project assignment, heading, and tags.
- Project progress rings in the sidebar and header.
- **Global search** across all to-dos (title + notes).
- **Trash** with soft-delete, restore, delete-forever, and empty-trash.
- **Headings** to group to-dos inside a project.
- **Repeat rules** (daily / weekly / monthly) — completing a repeating to-do spawns the next occurrence.
- **Reminders** with a date + time.
- **Create, rename, and delete Areas and Projects** right from the sidebar (double-click a name to rename; hover for actions).
- **Light + dark themes** with a toggle.
- **Local persistence** — everything is saved to `localStorage`, so your data survives a reload.

## Deployment

The app is a static single-page build, so it deploys to any static host.

**Render** (a `render.yaml` blueprint is included):
- New → **Static Site** (not a Web Service — there is no Node server to run).
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

Or use the blueprint directly: New → **Blueprint** → pick this repo → Render reads `render.yaml`.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Project structure

```
index.html            # Vite entry
src/main.jsx          # React root
src/App.jsx           # the entire Things clone (data model + UI)
src/index.css         # Tailwind directives + base layout
tailwind.config.js    # Tailwind configuration
```

## Notes on scope

State is stored locally in the browser (`localStorage`), seeded with sample data on first run — there is no cloud sync or backend, matching the "local-only, single-user" non-goals in the spec. Cloud sync, calendar integration, widgets, and collaboration are intentionally out of scope.
