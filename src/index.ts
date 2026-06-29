
import * as fs from "fs";
import * as path from "path";

const USERNAMES = ["linyyy-aaa", "ismailelk123456"];
const NTFY_ENDPOINT = "https://ntfy.sh/check_her_stat";
const CHECK_INTERVAL_MS = 15000; // 15 seconds for "live" mode
const STATE_FILE = path.join(import.meta.dir, "state.json");

interface UserState {
  isOnline: boolean;
  lastChecked: string;
  lastOnlineTime?: string;
  lastNotificationTime?: string;
}

interface ChessUser {
  username: string;
  last_online: number;
  joined: number;
}

interface GameData {
  games: Game[];
}

interface Game {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  white: {
    username: string;
    rating: number;
    result?: string;
  };
  black: {
    username: string;
    rating: number;
    result?: string;
  };
}

type AppState = Record<string, UserState>;

// Load or initialize state
function loadState(): AppState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      const parsed = JSON.parse(data);
      // Handle migration from old state format
      if (parsed && typeof parsed.isOnline === "boolean") {
        return { "linyyy-aaa": parsed };
      }
      return parsed || {};
    }
  } catch (error) {
    console.log("Creating new state file...");
  }
  return {};
}

// Save state
function saveState(state: AppState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Send notification via ntfy
async function sendNotification(
  title: string,
  message: string,
  priority: string = "default"
): Promise<void> {
  try {
    // Encode title to safely pass emojis in HTTP headers (RFC 2047)
    const encodedTitle = `=?UTF-8?B?${Buffer.from(title).toString("base64")}?=`;

    const response = await fetch(NTFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Title: encodedTitle,
        Priority: priority,
      },
      body: message,
    });

    if (!response.ok) {
      console.error(`❌ Notification failed: ${response.status}`);
    } else {
      console.log(`✅ Notification sent: ${title}`);
    }
  } catch (error) {
    console.error("❌ Error sending notification:", error);
  }
}

// Get user online status in real-time
async function getUserStatus(username: string): Promise<any> {
  try {
    // We use the internal popup API because it is real-time, unlike the public API which is cached
    const response = await fetch(
      `https://www.chess.com/callback/user/popup/${username}`
    );
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ Error fetching user status for ${username}:`, error);
    return null;
  }
}

// Get recent games
async function getRecentGames(username: string): Promise<Game[]> {
  try {
    // Get current date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const response = await fetch(
      `https://api.chess.com/pub/player/${username}/games/${year}/${month}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: GameData = await response.json();
    // Return last 5 games, most recent first
    return data.games.slice(0, 5);
  } catch (error) {
    console.error(`❌ Error fetching games for ${username}:`, error);
    return [];
  }
}

// Parse game result
function getGameResult(game: Game, username: string): {
  opponent: string;
  result: string;
} {
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const opponent = isWhite ? game.black.username : game.white.username;
  const result = isWhite ? game.white.result : game.black.result;

  let resultText = "Draw";
  if (result === "win") {
    resultText = "Won ✅";
  } else if (result === "loss") {
    resultText = "Lost ❌";
  }

  return { opponent, result: resultText };
}

// Main check function
async function checkChessStatus(): Promise<void> {
  console.log("\n🔍 Checking chess.com status...");

  const state = loadState();

  for (const username of USERNAMES) {
    // initialize state for user if not exists
    if (!state[username]) {
      state[username] = {
        isOnline: false,
        lastChecked: new Date().toISOString(),
      };
    }

    const userData = await getUserStatus(username);

    if (!userData) {
      console.log(`⚠️  Could not fetch user data for ${username}`);
      continue;
    }

    const isOnline = userData.onlineStatus !== "offline";
    const lastOnlineDate = userData.lastLoginDate;

    console.log(`👤 ${username} - Online: ${isOnline}`);
    console.log(`⏱️  Last online: ${lastOnlineDate}`);

    const userState = state[username];

    // Check if just came online
    if (isOnline && !userState.isOnline) {
      console.log(`🎉 ${username} just came online!`);

      // Get recent games
      const games = await getRecentGames(username);
      let gameInfo = "";

      if (games.length > 0) {
        const lastGame = games[0];
        const { opponent, result } = getGameResult(lastGame, username);
        gameInfo = `\n\n📊 Last game: vs ${opponent} - ${result}`;
      }

      await sendNotification(
        `🎉 ${username} is Online!`,
        `They're now playing chess!${gameInfo}`,
        "high"
      );

      userState.isOnline = true;
      userState.lastOnlineTime = new Date().toISOString();
      userState.lastNotificationTime = new Date().toISOString();
    }
    // Check if just went offline
    else if (!isOnline && userState.isOnline) {
      console.log(`👋 ${username} just went offline (no notification sent)`);
      userState.isOnline = false;
    }

    userState.lastChecked = new Date().toISOString();
  }

  saveState(state);
}

// Start cron job
console.log(`\n🚀 Chess Monitor Started`);
console.log(`📍 Monitoring: ${USERNAMES.join(', ')}`);
console.log(`⏰ Check interval: Every 15 seconds (Live Mode)`);
console.log(`🔔 Notifications via ntfy`);
console.log(`\n⏳ Waiting for next check...\n`);

// Run immediately on start
await sendNotification(
  "🚀 Monitor Started",
  `Now monitoring: ${USERNAMES.join(', ')} (Live Mode)`
);
await checkChessStatus();

// Schedule recurring checks for "live" polling
setInterval(async () => {
  await checkChessStatus();
}, CHECK_INTERVAL_MS);

// Keep the process running and bind to a port for cloud providers
const port = process.env.PORT || 3000;
Bun.serve({
  port: port,
  fetch() {
    return new Response("Chess Monitor is running!");
  },
});
console.log(`✨ Service running on port ${port}. Press Ctrl+C to stop.`);
