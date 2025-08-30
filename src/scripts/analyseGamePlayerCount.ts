import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { connectToDatabase } from "../config/database";
import dotenv from "dotenv";

type AnyRec = Record<string, any>;

interface CliOptions {
  season?: number;
  beforeMin: number;
  afterMin: number;
  limit?: number;
}

function parseArgs(argv: string[]): CliOptions {
  const out: CliOptions = { beforeMin: 60, afterMin: 60 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if ((a === "--season" || a === "-s") && next) {
      out.season = Number(next);
      i++;
    } else if ((a === "--before" || a === "-b") && next) {
      out.beforeMin = Number(next);
      i++;
    } else if ((a === "--after" || a === "-a") && next) {
      out.afterMin = Number(next);
      i++;
    } else if ((a === "--limit" || a === "-n") && next) {
      out.limit = Number(next);
      i++;
    }
  }
  return out;
}

function toMs(min: number): number {
  return Math.max(0, Math.floor(min)) * 60_000;
}

function extractTotalPlayers(entry: AnyRec): number | null {
  const maybe = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null);
  if (entry == null || typeof entry !== "object") return null;
  const direct = maybe(entry.annihilation);
  if (direct != null) return direct;
  const us = maybe(entry.annihilation_us);
  const eu = maybe(entry.annihilation_eu);
  if (us != null || eu != null) return (us ?? 0) + (eu ?? 0);
  const counts = entry.counts;
  if (counts && typeof counts === "object") {
    const d = maybe(counts.annihilation);
    if (d != null) return d;
    const cus = maybe(counts.annihilation_us);
    const ceu = maybe(counts.annihilation_eu);
    if (cus != null || ceu != null) return (cus ?? 0) + (ceu ?? 0);
  }
  return null;
}

async function readPlayerCountBetween(start: Date, end: Date): Promise<Array<{ ts: Date; total: number }>> {
  const logDir = path.join(process.cwd(), "logs", "playerCounts");
  const files: string[] = await glob(`${logDir}/*.log`).catch(() => []);
  if (!files.length) return [];
  const out: Array<{ ts: Date; total: number }> = [];
  for (const file of files) {
    const content = await fs.readFile(file, "utf-8").catch(() => "");
    if (!content) continue;
    const lines = content.split("\n").filter((l) => l.trim() !== "");
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const ts = new Date(obj.timestamp);
        if (!(ts instanceof Date) || isNaN(+ts)) continue;
        if (ts < start || ts > end) continue;
        const total = extractTotalPlayers(obj);
        if (total != null) out.push({ ts, total });
      } catch {
        // ignore bad lines
      }
    }
  }
  // sort by time
  out.sort((a, b) => a.ts.getTime() - b.ts.getTime());
  return out;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const arr = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
}

function peak(nums: Array<{ ts: Date; total: number }>, start: Date): { value: number; minutesAfter: number } | null {
  if (!nums.length) return null;
  let best = nums[0];
  for (const v of nums) if (v.total > best.total) best = v;
  return { value: best.total, minutesAfter: Math.round((best.ts.getTime() - start.getTime()) / 60000) };
}

async function main() {
  dotenv.config();
  const opts = parseArgs(process.argv);
  const db = await connectToDatabase();

  // Resolve season filter
  let seasonId: string | undefined;
  if (typeof opts.season === "number" && Number.isFinite(opts.season)) {
    const s = await db.collection("Season").findOne<{ _id: string }>({ number: opts.season });
    if (!s) {
      console.error(`Season ${opts.season} not found.`);
      process.exit(1);
    }
    seasonId = s._id as unknown as string;
  }

  const gameQuery: AnyRec = {};
  if (seasonId) gameQuery.seasonId = seasonId;
  gameQuery.finished = true;

  const cursor = db
    .collection("Game")
    .find<{ _id: string; startTime: Date; endTime?: Date }>(gameQuery)
    .project({ _id: 1, startTime: 1, endTime: 1 })
    .sort({ startTime: 1 });

  if (opts.limit && Number.isFinite(opts.limit)) cursor.limit(opts.limit);

  const games = await cursor.toArray();
  if (!games.length) {
    console.log("No games found for given filter.");
    return;
  }

  const beforeMs = toMs(opts.beforeMin);
  const afterMs = toMs(opts.afterMin);

  const results: AnyRec[] = [];
  for (const g of games) {
    const start = new Date(g.startTime);
    const from = new Date(start.getTime() - beforeMs);
    const to = new Date(start.getTime() + afterMs);
    const series = await readPlayerCountBetween(from, to);
    const beforeVals = series.filter((p) => p.ts < start).map((p) => p.total);
    const afterVals = series.filter((p) => p.ts >= start).map((p) => p.total);

    const baselineAvg = avg(beforeVals);
    const eventAvg = avg(afterVals);
    const baselineMedian = median(beforeVals);
    const eventMedian = median(afterVals);
    const pk = peak(series.filter((p) => p.ts >= start), start);

    const deltaAbs = baselineAvg != null && eventAvg != null ? eventAvg - baselineAvg : null;
    const deltaPct = baselineAvg != null && eventAvg != null && baselineAvg !== 0 ? (100 * (eventAvg - baselineAvg)) / baselineAvg : null;

    results.push({
      gameId: g._id,
      startTime: start.toISOString(),
      windowBeforeMin: opts.beforeMin,
      windowAfterMin: opts.afterMin,
      samplesBefore: beforeVals.length,
      samplesAfter: afterVals.length,
      baselineAvg,
      eventAvg,
      baselineMedian,
      eventMedian,
      peakAfter: pk?.value ?? null,
      minutesToPeak: pk?.minutesAfter ?? null,
      deltaAbs,
      deltaPct,
    });
  }

  const validDeltas = results.map((r) => r.deltaAbs).filter((v): v is number => typeof v === "number");
  const overall = {
    games: results.length,
    meanDeltaAbs: avg(validDeltas),
    medianDeltaAbs: median(validDeltas),
  };

  console.log(JSON.stringify({ options: opts, overall, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
