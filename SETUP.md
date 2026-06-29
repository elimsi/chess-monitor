# Chess Monitor Setup Guide

## Quick Start

```bash
cd chess-monitor
bun install
bun run start
```

## How to Keep it Running

### Option 1: Local Machine (Simple)
Run in a tmux/screen session that persists:

```bash
tmux new-session -d -s chess "cd /home/user/chess-monitor && bun run start"
```

Check status: `tmux attach-session -t chess`

### Option 2: Systemd Service (Linux)

Create `/etc/systemd/system/chess-monitor.service`:

```ini
[Unit]
Description=Chess Monitor for linyyy-aaa
After=network.target

[Service]
Type=simple
User=user
WorkingDirectory=/home/user/chess-monitor
ExecStart=/usr/bin/bun run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable chess-monitor
sudo systemctl start chess-monitor
```

### Option 3: Docker
Create `Dockerfile`:
```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
CMD ["bun", "run", "start"]
```

```bash
docker build -t chess-monitor .
docker run -d --name chess-monitor chess-monitor
```

## Notifications

Notifications go to your ntfy endpoint (already configured). Download the **ntfy** app on your phone to get push notifications.

## What You'll Get

- **🎉 She's Online** → High priority notification with last game info
- **👋 She went offline** → Notification with last online time

The service checks every 15 minutes and tracks state changes.

## Troubleshooting

- Check logs: `bun run start` (or `journalctl -u chess-monitor` for systemd)
- Verify ntfy endpoint is correct in `src/index.ts`
- Make sure username is spelled correctly: `linyyy-aaa`
- API rate limits: Chess.com allows reasonable use; 15-min checks are well within limits

## Customization

Edit `src/index.ts`:
- Change check interval (line ~206)
- Modify notification messages
- Add more chess.com stats (blitz rating, bullet rating, etc.)
