# Tenfold

An original pink-and-green multiplayer progressive rummy game for 2–6 players. Create a room, share its five-character code, and play without game accounts. Includes practice bots, all ten phases, wilds, phase staging, scoring, round results, reconnects, turn timers, reactions, synthesized sounds, and a responsive card table.

## Run locally

Use **Node 22.13+** (Node 24 recommended) and npm. No external API keys are needed.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_aromatic_proemial_gods.sql
npm run dev
```

Open `http://localhost:5173`. The migration is a one-time setup for an empty local database. For a second player on the same computer, use a different browser or private browsing profile. Tabs in the same browser profile intentionally restore the same player. Use the practice button to play against two bots, or add bots from a lobby.

The preview uses a persistent local SQLite database in `.wrangler/state`. Reloading preserves your player and hand through an HttpOnly session cookie; clearing cookies loses that seat. Room and session information never goes in localStorage. Only the sound preference is stored there.

## Architecture

- React 19, TypeScript, Next-style App Router, Tailwind 4, Radix/shadcn UI primitives.
- Vinext compiles the application for Cloudflare Workers. This keeps the frontend close to Next.js while allowing deployment with managed D1 persistence and streaming responses.
- Cloudflare D1 holds one authoritative JSON snapshot per room, plus a version used for optimistic concurrency.
- Client actions are JSON POSTs validated with Zod and then by the pure game engine. A conditional SQL update commits only if the version still matches. Conflicting updates reload and revalidate; duplicate draws and out-of-turn actions fail.
- Server-Sent Events publish a player-specific snapshot about every 900 ms. This is realtime synchronization over HTTP, not a WebSocket server. Streams reconnect automatically. Requests and streams never expose the deck, other hands, or session hashes.
- A random 256-bit HttpOnly cookie identifies the browser session. Only its SHA-256 hash is stored in room state. HTTPS uses Secure cookies. SameSite cookies, same-origin checks, and server ownership/turn checks guard mutations.

### Main entities and flow

`Game` owns room status, host, players, deck, discard pile, turn, draw/play step, round, timer, completed groups, scores, and activity. `Player` owns a private hand, objective index, completion flag, session hash, and presence. `Combination` keeps cards and fixed run values so wilds cannot be reassigned after playing. `View` is the redacted per-player projection.

Create → lobby → host starts → draw → optionally play phase / hit → discard → next player → empty hand ends round → score leftovers / advance completed phases → next round → finish phase ten → rankings / rematch.

## Organization

- `config/game.ts`: brand, deck, all phases, scoring, avatars, reactions.
- `lib/game/types.ts`: canonical and public state types.
- `lib/game/validation.ts`: sets, runs, colors, wild assignment, phase matching, hitting.
- `lib/game/engine.ts`: immutable actions, turn flow, scoring, rounds, bots, redaction.
- `lib/server/rooms.ts`: D1 persistence, session identity, compare-and-swap, presence.
- `app/api/rooms`: create/join/actions and event stream endpoints.
- `components/game`: cards, reusable chrome/how-to-play, room/table interface.
- `db/schema.ts` and `drizzle/`: database definition and versioned migrations.
- `tests/`: game-rule tests and two-session HTTP integration test.

## Tests

```sh
npm test
npx tsc --noEmit
# With the local server running:
node tests/integration.mjs
```

Engine tests cover all ten objectives, wild and duplicate-card edge cases, immutable run assignments, legal hits, ownership, turn order, double draws, card conservation, scoring, phase advancement, final tie breaks, rematches, deck recycling, and privacy. Integration tests use separate cookie jars to exercise joining, refreshing, concurrent draws, redaction, SSE, and invalid rooms.

## Rules

Draw one card at the start of a turn. Use the deck or top discard; a discarded wild cannot be picked up. Stage the exact number of cards required by the current phase and play every group together. All-wild groups are allowed. Runs use numbers 1–12 without wrapping, and each wildcard's run value is fixed when played. Sets and color groups may accept more compatible cards after completion. A player must first complete their own phase before hitting any group on the table. Discard one card to end the turn, unless playing or hitting empties the hand and ends the round immediately.

Only players who laid down their phase advance. Leftover cards score 5 for 1–9, 10 for 10–12, and 25 for wilds. All players completing phase ten in the final round qualify; lowest cumulative score breaks the tie. Identical scores retain seat order.

No skip/action cards are included. Timer defaults to off. Available timers are 30, 60, or 90 seconds per whole turn. Expiry causes a legal draw if needed and an automatic discard. Presence and timers are server-authoritative but processed when a connected client requests/streams updates; a completely abandoned table pauses until someone returns. After 60 seconds without the host, an active human member takes over hosting. After 90 seconds disconnected, an absent player gets an automatic draw/discard when their turn comes; their seat and session remain available for reconnection.

## Deploy

This checkout targets **Sites / Cloudflare Workers + D1**, not a drop-in Vercel deployment. The pure engine and React UI are portable; moving to Vercel requires replacing the D1 binding with an HTTP database adapter and adjusting the realtime runtime.

`.openai/hosting.json` declares the `DB` binding and Sites project. `npm run build` emits the Worker, client assets, manifest, and migrations. The managed publishing flow saves the exact Git revision and deploys the archive, applying D1 migrations before upload. Keep migration history immutable once applied. Never include `.wrangler/state`, cookies, or actual secrets in source archives.

A newly deployed Site is owner-private by default. Friends need access through the hosting platform before they can reach room links. Hosting access is separate from the game's account-free session system. Public access must be enabled explicitly before distributing a room to arbitrary friends.

`.env.example` documents the optional local test setting. No Supabase, database password, or external sound/image service is needed. The managed `DB` binding is provisioned by Sites, not an environment string.

## Scope and operational notes

The app is a functioning small-room implementation. It has not been load-tested for large public traffic. SSE reads D1 per connected player and is designed for small private games. Practice bots use server state and ordinary legal actions, with no production debug controls or client ability to alter hands. No full text chat, spectators, persistent account statistics, or external asset dependencies are included. Card shapes and artwork are CSS-generated; sound effects are original Web Audio tones and default to off.
