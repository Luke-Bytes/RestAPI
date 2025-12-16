import axios from "axios";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { createGzip } from "node:zlib";

type PlayerCountEntry = Record<string, any> & { timestamp: string };

const pipelineAsync = promisify(pipeline);
const PLAYER_COUNT_DIR = path.join(process.cwd(), "playerCounts");

let buffer: PlayerCountEntry[] = [];
let bufferDateKey: string | null = null;
let midnightTimer: NodeJS.Timeout | null = null;

function ensureDir() {
  mkdirSync(PLAYER_COUNT_DIR, { recursive: true });
}

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function flushBuffer(reason = "scheduled"): Promise<void> {
  if (buffer.length === 0 || !bufferDateKey) return;
  ensureDir();

  const filename = `playerCounts-${bufferDateKey}.log.gz`;
  const filePath = path.join(PLAYER_COUNT_DIR, filename);

  const content = buffer.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
  const source = Readable.from(content);

  try {
    await pipelineAsync(source, createGzip(), createWriteStream(filePath));
    console.log(`Flushed ${buffer.length} player count entries to ${filePath} (${reason}).`);
  } catch (err) {
    console.error("Failed to flush player count buffer:", err);
  } finally {
    buffer = [];
    bufferDateKey = null;
  }
}

function scheduleMidnightFlush() {
  if (midnightTimer) clearTimeout(midnightTimer);
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const delay = nextMidnight.getTime() - now.getTime();

  midnightTimer = setTimeout(async () => {
    await flushBuffer("midnight");
    scheduleMidnightFlush();
  }, delay);
}

async function fetchPlayerCounts() {
  try {
    const url = `https://shotbow.net/serverList.json?t=${new Date().getTime()}`;
    const response = await axios.get(url);
    const data = response.data;

    const dataWithTimestamp: PlayerCountEntry = { timestamp: new Date().toISOString(), ...data };
    const entryDateKey = getDateKey(new Date(dataWithTimestamp.timestamp));

    if (bufferDateKey && bufferDateKey !== entryDateKey) {
      await flushBuffer("date-change");
    }

    bufferDateKey = bufferDateKey ?? entryDateKey;
    buffer.push(dataWithTimestamp);
  } catch (error) {
    console.error("Error fetching player counts from endpoint:", error);
  }
}

function getDelayUntilNextHalfHour(): number {
  const now = new Date();
  let nextRun: Date;
  if (now.getMinutes() < 30) {
    nextRun = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      30,
      0,
      0
    );
  } else {
    nextRun = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours() + 1,
      0,
      0,
      0
    );
  }
  return nextRun.getTime() - now.getTime();
}

export function schedulePlayerCountFetch() {
  ensureDir();
  const delay = getDelayUntilNextHalfHour();

  setTimeout(() => {
    void fetchPlayerCounts();
    setInterval(() => void fetchPlayerCounts(), 30 * 60 * 1000);
  }, delay);

  scheduleMidnightFlush();

  const shutdown = async () => {
    await flushBuffer("shutdown");
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

export { fetchPlayerCounts };
