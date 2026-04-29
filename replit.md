# Goat Bot V2 — 2026 Edition

A fork of Goat-Bot-V2 (NTKhang) hardened for the Greatest-Bot-Of-All-Time-2026 repository, with new working game commands, persistent records, an aesthetic live status page, and one-click deploy on Render & Railway.

## What's in this fork

### New game commands (all economy-linked, persistent)
| Command | Aliases | Description |
| --- | --- | --- |
| `/slot <bet>` | `slots`, `scatter` | Slot machine with scatter (⭐) bonuses up to x100 |
| `/blackjack <bet>` | `bj` | Full blackjack vs dealer — hit / stand / double |
| `/dice <high\|low\|7> <bet>` | `roll` | Two-dice prediction game, 3x payout on 7 |
| `/coinflip <head\|tail> <bet>` | `cf`, `flip` | Classic double-or-nothing |
| `/rps <choice> <bet>` | `rockpaperscissors` | Rock-Paper-Scissors with 1.8x payout |
| `/roulette <colour\|even\|odd\|0-36> <bet>` | `rl` | European roulette, 35x on a single number |
| `/lottery buy [count]` | `lotto` | Buy tickets, admin draws winner — full pool payout |
| `/mines <bet> [mines]` | `mine` | 5×5 minefield, dynamic multiplier, cash-out anytime |
| `/canvas [@tag\|reply]` | `card` | Renders a custom aesthetic card image (avatar + stats) |
| `/top [n]` | `rich`, `richest`, `leaderboard`, `lb` | Top 10 (or up to 25) richest players + your own rank |

All games use `usersData.get/set` so balances persist in the SQLite DB **forever** — they survive restarts, crashes, and redeploys.

### Status dashboard
Replaces the stub `dashboard/app.js` with a full landing page at `/`:
- Live stats (uptime, command count, user count, memory, node version)
- `/api/stats` JSON endpoint, `/health` for platform health checks
- Color-shifting gradient title, animated rainbow ticker, conic-gradient logo
- Responsive, ETA-free, zero external dependencies — pure HTML+CSS+vanilla JS
- Source: `dashboard/views/status.html`

### Deployment configs
- `render.yaml` — one-click Render web service (Node 20, healthcheck `/health`, free plan)
- `railway.json` — Railway nixpacks build, healthcheck `/health`, auto-restart on failure
- `nixpacks.toml` — extra nix packages (cairo, pango, librsvg) needed by node-canvas
- `Procfile` — generic `web: node index.js` for Heroku-style platforms
- `.env.example` — documented env vars

The dashboard listens on `process.env.PORT` first, then falls back to `config.dashBoard.port`, then 3001.

### Removed
- `scripts/cmds/gay.js` — inappropriate avatar-mod command

## Persistence
`config.json` already specifies `"database": { "type": "sqlite" }`. The `database/` directory contains SQLite models (`user`, `thread`, `global`, `userDashBoard`) and a controller layer that ensures every `usersData.set(...)` writes to disk immediately. Records are not held only in memory — they survive any restart.

To use MongoDB instead, set `database.type` to `"mongodb"` and put your URI in `database.uriMongodb`.

## Running locally
```bash
npm install
node index.js
```
First boot: the bot will prompt for a Facebook account / cookie (`account.txt`) — see `STEP_INSTALL.md`.

## Deploying

### Render
1. Push to GitHub
2. New → Web Service → connect repo
3. Render auto-detects `render.yaml`. Set the `account.txt` content as a Secret File at `/etc/secrets/account.txt` (and copy it on start, or paste cookie via dashboard once running).

### Railway
1. New project → Deploy from GitHub
2. Railway picks up `railway.json` + `nixpacks.toml`
3. Add environment variables from `.env.example`

## Project structure (relevant bits)
```
index.js                         — entry; spawns Goat.js with auto-restart
Goat.js                          — config validation, env, logo, login launcher
bot/login/login.js               — FB login + dashboard bootstrap
dashboard/app.js                 — Express server (status page + APIs)
dashboard/views/status.html      — animated landing page
scripts/cmds/                    — all chat commands (each ≈ 1 file ≈ short)
scripts/events/                  — welcome / leave / log / antichange / etc
database/                        — SQLite + MongoDB controllers and models
languages/                       — en.lang + vi.lang translation packs
render.yaml / railway.json       — deploy configs
```

## Pushing to GitHub safely
**Never paste tokens in chat.** Use Replit's secret manager:
1. Open Secrets in the workspace, add a secret named `GITHUB_TOKEN` with a fresh fine-grained PAT (scope: contents:write to your repo only).
2. From the shell:
   ```bash
   git remote set-url origin https://x-access-token:$GITHUB_TOKEN@github.com/edrez1/Greatest-Bot-Of-All-Time-2026.git
   git add -A
   git commit -m "feat: games, canvas, status page, deploy configs"
   git push origin main
   ```
3. Revoke that PAT immediately after the push.
