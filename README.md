# Chess.com Online Monitor

Real-time notifications when your girlfriend comes online on chess.com. Notifications via ntfy.

## Setup

```bash
bun install
```

## Run

```bash
# Development (watch mode)
bun run dev

# Production
bun run start
```

## How it works

- Checks chess.com every 15 minutes for online status
- Sends ntfy notification when she comes online/offline
- Shows rating, last game opponent, and result
- Stores state to track online status changes
- All timestamps in Casablanca timezone

## Configuration

Edit `src/index.ts` to customize:
- `USERNAME` - Chess.com username
- `NTFY_ENDPOINT` - Your ntfy notification URL
- `CHECK_INTERVAL` - Cron schedule (default: every 15 min)

## Requirements

- Bun runtime
- Internet connection for chess.com API & ntfy

## Deployment

### Keep running locally (simple)
Use `bun run start` in a tmux/screen session, or set up a systemd service.

### Cloud deployment
Deploy to Vercel, Heroku, or any Node.js host that supports Bun. The service will run in the background making periodic API calls.

## Notifications

Get push notifications on mobile via ntfy app (already configured with your endpoint).
