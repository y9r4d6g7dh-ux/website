# EasyLife

**Less chaos. More life.** A calm, local-first daily planner: priorities, time-block planning, calendar, focus timer, notes, goals and weekly consistency — in a minimalist interface that works on phone, tablet and desktop.

It runs entirely on your computer. No account, no database server and no API key are needed.

## Quick start

You need [Node.js](https://nodejs.org) 20.9 or newer (the LTS installer is fine).

### macOS

```bash
cd path/to/website
npm install
npm run dev
```

### Windows (PowerShell or Command Prompt)

```bat
cd path\to\website
npm install
npm run dev
```

Then open **http://localhost:3000**.

The first time, Windows may ask whether Node.js may accept network connections — choose **Allow** on *Private networks* if you want to open the app from your phone.

## Open it on your iPhone (same Wi-Fi)

1. Start the app with `npm run dev`. The terminal prints two addresses:
   ```
   - Local:    http://localhost:3000
   - Network:  http://192.168.1.23:3000   ← use this one
   ```
2. On the iPhone, connected to the **same Wi-Fi**, open Safari and type the **Network** address, including `:3000`.
3. Optional: tap **Share → Add to Home Screen** to launch it full-screen like an app.

If the page doesn't load:

- **No Network line, or it's wrong?** Find your computer's IP yourself — macOS: `ipconfig getifaddr en0` · Windows: `ipconfig`, then read *IPv4 Address*.
- **Firewall:** macOS → System Settings → Network → Firewall → allow incoming connections for Node. Windows → allow Node.js on Private networks.
- **Network:** guest and office Wi-Fi often block device-to-device traffic. Use a home network or your phone's hotspot. Turn off any VPN on either device.
- Use `http://`, not `https://`.

Each device keeps its own data: tasks you add on the phone live in the phone's browser, not on your computer.

## Two modes

| | Local Demo Mode (default) | Real AI Mode |
|---|---|---|
| Needs | nothing | an Anthropic API key |
| "Plan my day" | deterministic rule-based engine (`src/lib/planner.ts`) | AI model, checked by the same engine before it's shown |
| "Ask EasyLife" | keyword rules (`src/lib/assistant.ts`) | AI model |
| Your data | IndexedDB in your browser | IndexedDB in your browser |

The status pill (top right on mobile, bottom of the sidebar on desktop) always shows which mode is active, and every plan and answer is labelled with its source. Demo answers are never presented as AI.

### Enable Real AI Mode

1. Copy the example file — macOS: `cp .env.example .env.local` · Windows: `copy .env.example .env.local`
2. Put your key in `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart `npm run dev`. The pill changes to **AI connected**.

The key is read only by the server route `src/app/api/ai/route.ts` and is never sent to the browser. In AI mode, the day's open tasks and events are sent to the model when you press *Plan my day* or *Ask EasyLife*. If the AI call fails, or returns a plan with overlaps, EasyLife falls back to the local engine and says so. Optional: `EASYLIFE_AI_MODEL` picks the model (default `claude-opus-5-5`).

## What's inside

- **Home** — greeting, today's focus (priorities, upcoming events, progress ring), planning input, today's timeline.
- **Planner** — *Day*: time-block plan with conflict detection, "Plan my day", "Smart reschedule" (carries unfinished tasks forward and re-plans the time left), ±15 min nudges. *Tasks*: everything grouped, quick add (`Call the bank 20m !`). *Notes*.
- **Calendar** — month view (buttons, swipe, or arrow keys), events with live overlap warnings.
- **Focus** — timer with a distraction-free Focus Mode; sessions are logged. Survives a reload.
- **Profile** — weekly consistency, streak, goals with milestones, optional daily review, dark/light theme, working hours, **reset demo data** / erase everything.

When every priority task for the day is done you get one quiet message: "Day complete. Well done."

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 (reachable from your network) |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Unit tests: planning engine, conflict detection, IndexedDB persistence, stats |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |

## Project layout

```
src/app/            pages (Home, planner, calendar, focus, profile) and API routes
src/components/     app shell, editors, timeline, task rows, plan sheet
src/components/ui/  design-system primitives (Button, Sheet, Field, ProgressRing…)
src/lib/            planner engine, local assistant, IndexedDB repo, store, stats, seed data
tests/              Vitest suites
```

Design tokens (colors for both themes) live at the top of `src/app/globals.css`; motion timings in `src/lib/motion.ts`. Animations respect the system "Reduce Motion" setting.

## Troubleshooting

- **Port 3000 is busy** — stop the other program, or run `npx next dev -p 3001`.
- **Status pill shows a red dot** — the browser is blocking storage (often private browsing). The app still works, but changes are lost when the tab closes.
- **Start over** — Profile → Data → Reset.

## Not included yet

Accounts, cloud sync, subscriptions and deployment are intentionally left for later. All data access goes through `src/lib/db.ts` and `src/lib/store.tsx`, which is where a synced backend would plug in.
