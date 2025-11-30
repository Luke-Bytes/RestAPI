import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { connectToDatabase } from "../config/database";
import dotenv from "dotenv";

type AnyRec = Record<string, any>;

interface CliOptions {
  season?: number;
  beforeMin: number;
  limit?: number;
  controlWeeks?: number;
  csv?: string;
  boots?: number;
}

const AFTER_MIN_FIXED = 90;

function parseArgs(argv: string[]): CliOptions {
  const out: CliOptions = { beforeMin: 90 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if ((a === "--season" || a === "-s") && next) {
      out.season = Number(next); i++;
    } else if ((a === "--before" || a === "-b") && next) {
      out.beforeMin = Number(next); i++;
    } else if ((a === "--limit" || a === "-n") && next) {
      out.limit = Number(next); i++;
    } else if (a === "--control-weeks" && next) {
      out.controlWeeks = Number(next); i++;
    } else if (a === "--csv" && next) {
      out.csv = next; i++;
    } else if (a === "--boots" && next) {
      out.boots = Number(next); i++;
    }
  }
  return out;
}

function toMs(min: number): number { return Math.max(0, Math.floor(min)) * 60_000; }

function extractTotalPlayers(entry: AnyRec): number | null {
  const maybe = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null);
  if (entry == null || typeof entry !== "object") return null;
  const direct = maybe(entry.annihilation);
  if (direct != null) return direct;
  const counts = entry.counts;
  if (counts && typeof counts === "object") {
    const d = maybe(counts.annihilation);
    if (d != null) return d;
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
    const lines = content.split("").filter((l) => l.trim() !== "");
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const ts = new Date(obj.timestamp);
        if (!(ts instanceof Date) || isNaN(+ts)) continue;
        if (ts < start || ts > end) continue;
        const total = extractTotalPlayers(obj);
        if (total != null) out.push({ ts, total });
      } catch {}
    }
  }
  out.sort((a, b) => a.ts.getTime() - b.ts.getTime());
  return out;
}

function avg(nums: number[]): number | null { if (!nums.length) return null; return nums.reduce((a, b) => a + b, 0) / nums.length; }

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const arr = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
}

function percentile(nums: number[], p: number): number | null {
  if (!nums.length) return null;
  const arr = nums.slice().sort((a, b) => a - b);
  const idx = (arr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}

function peak(nums: Array<{ ts: Date; total: number }>, start: Date, end: Date): { value: number; minutesAfter: number } | null {
  const windowed = nums.filter((p) => p.ts >= start && p.ts <= end);
  if (!windowed.length) return null;
  let best = windowed[0];
  for (const v of windowed) if (v.total > best.total) best = v;
  return { value: best.total, minutesAfter: Math.round((best.ts.getTime() - start.getTime()) / 60000) };
}

function sum(nums: number[]): number { return nums.reduce((a,b)=>a+b,0); }

function safeLogDelta(afterAvg: number | null, beforeAvg: number | null, eps = 1e-6): number | null {
  if (afterAvg == null || beforeAvg == null) return null;
  return Math.log(afterAvg + eps) - Math.log(beforeAvg + eps);
}

function formatISO(d: Date): string { return new Date(d).toISOString(); }

function hourOfWeek(date: Date): number {
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  return day * 24 + hour;
}

function hasGameStartInWindow(gameStartsMs: number[], fromMs: number, toMs: number): boolean {
  for (const ms of gameStartsMs) { if (ms >= fromMs && ms <= toMs) return true; }
  return false;
}

function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map((v) => v == null ? "" : String(v).split('"').join('""')).map((v)=>`"${v}"`).join(",");
}

async function main() {
  dotenv.config();
  const opts = parseArgs(process.argv);
  const db = await connectToDatabase();

  let seasonId: string | undefined;
  if (typeof opts.season === "number" && Number.isFinite(opts.season)) {
    const s = await db.collection("Season").findOne<{ _id: string }>({ number: opts.season });
    if (!s) { console.error(`Season ${opts.season} not found.`); process.exit(1); }
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
  if (!games.length) { console.log("No games found for given filter."); return; }

  const gameStartsMs = games.map((g) => new Date(g.startTime).getTime());

  const beforeMs = toMs(opts.beforeMin);
  const afterMs = toMs(AFTER_MIN_FIXED);
  const controlWeeks = Math.max(0, Math.floor(opts.controlWeeks ?? 4));
  const eps = 1e-6;

  type Row = {
    gameId: string;
    startTime: string;
    hourOfWeek: number;
    windowBeforeMin: number;
    windowAfterMin: number;
    samplesBefore: number;
    samplesAfter: number;
    baselineAvg: number | null;
    eventAvg: number | null;
    baselineMedian: number | null;
    eventMedian: number | null;
    peakAfter: number | null;
    minutesToPeak: number | null;
    deltaAbs: number | null;
    deltaPct: number | null;
    deltaLog: number | null;
    controlCount: number;
    controlDeltaAbsMean: number | null;
    controlDeltaPctMean: number | null;
    controlDeltaLogMean: number | null;
    didDeltaAbs: number | null;
    didDeltaPct: number | null;
    didDeltaLog: number | null;
  };

  const results: Row[] = [];

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
    const pk = peak(series, start, to);

    const deltaAbs = (baselineAvg != null && eventAvg != null) ? (eventAvg - baselineAvg) : null;
    const deltaPct = (baselineAvg != null && eventAvg != null && Math.abs(baselineAvg) > eps)
      ? (100 * (eventAvg - baselineAvg)) / baselineAvg
      : null;
    const deltaLog = safeLogDelta(eventAvg, baselineAvg, eps);

    const ctrlDeltasAbs: number[] = [];
    const ctrlDeltasPct: number[] = [];
    const ctrlDeltasLog: number[] = [];

    for (let w = 1; w <= controlWeeks; w++) {
      const ctrlStart = new Date(start.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const ctrlFrom = new Date(ctrlStart.getTime() - beforeMs);
      const ctrlTo = new Date(ctrlStart.getTime() + afterMs);
      if (hasGameStartInWindow(gameStartsMs, ctrlFrom.getTime(), ctrlTo.getTime())) continue;
      const ctrlSeries = await readPlayerCountBetween(ctrlFrom, ctrlTo);
      const ctrlBefore = ctrlSeries.filter((p) => p.ts < ctrlStart).map((p) => p.total);
      const ctrlAfter = ctrlSeries.filter((p) => p.ts >= ctrlStart).map((p) => p.total);
      const cBeforeAvg = avg(ctrlBefore);
      const cAfterAvg = avg(ctrlAfter);
      if (cBeforeAvg != null && cAfterAvg != null) {
        ctrlDeltasAbs.push(cAfterAvg - cBeforeAvg);
        if (Math.abs(cBeforeAvg) > eps) ctrlDeltasPct.push(100 * (cAfterAvg - cBeforeAvg) / cBeforeAvg);
        const cLog = safeLogDelta(cAfterAvg, cBeforeAvg, eps);
        if (cLog != null) ctrlDeltasLog.push(cLog);
      }
    }

    const ctrlAbsMean = avg(ctrlDeltasAbs);
    const ctrlPctMean = avg(ctrlDeltasPct);
    const ctrlLogMean = avg(ctrlDeltasLog);

    const didAbs = (deltaAbs != null && ctrlAbsMean != null) ? (deltaAbs - ctrlAbsMean) : null;
    const didPct = (deltaPct != null && ctrlPctMean != null) ? (deltaPct - ctrlPctMean) : null;
    const didLog = (deltaLog != null && ctrlLogMean != null) ? (deltaLog - ctrlLogMean) : null;

    results.push({
      gameId: g._id as unknown as string,
      startTime: formatISO(start),
      hourOfWeek: hourOfWeek(start),
      windowBeforeMin: opts.beforeMin,
      windowAfterMin: AFTER_MIN_FIXED,
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
      deltaLog,
      controlCount: ctrlDeltasAbs.length,
      controlDeltaAbsMean: ctrlAbsMean ?? null,
      controlDeltaPctMean: ctrlPctMean ?? null,
      controlDeltaLogMean: ctrlLogMean ?? null,
      didDeltaAbs: didAbs,
      didDeltaPct: didPct,
      didDeltaLog: didLog,
    });
  }

  const deltasAbs = results.map((r) => r.deltaAbs).filter((x): x is number => x != null);
  const deltasPct = results.map((r) => r.deltaPct).filter((x): x is number => x != null);
  const deltasLog = results.map((r) => r.deltaLog).filter((x): x is number => x != null);
  const didAbsArr = results.map((r) => r.didDeltaAbs).filter((x): x is number => x != null);
  const didPctArr = results.map((r) => r.didDeltaPct).filter((x): x is number => x != null);
  const didLogArr = results.map((r) => r.didDeltaLog).filter((x): x is number => x != null);

  function sumNum(arr: number[]): number { return arr.reduce((a,b)=>a+b,0); }

  const baselineSum = sumNum(results.map((r) => r.baselineAvg ?? 0));
  const deltaAbsSum = sumNum(results.map((r) => r.deltaAbs ?? 0));
  const weightedPct = baselineSum > 0 ? (100 * deltaAbsSum) / baselineSum : null;

  const BOOTS = Math.max(100, Math.floor(parseInt(String(opts.boots ?? 1000),10)));
  function bootstrapCI(data: number[]): { lo: number | null; hi: number | null } {
    if (!data.length) return { lo: null, hi: null };
    const means: number[] = [];
    for (let b = 0; b < BOOTS; b++) {
      let sumB = 0;
      for (let i = 0; i < data.length; i++) {
        const j = Math.floor(Math.random() * data.length);
        sumB += data[j];
      }
      means.push(sumB / data.length);
    }
    const lo = percentile(means, 0.025);
    const hi = percentile(means, 0.975);
    return { lo: lo ?? null, hi: hi ?? null };
  }

  const ciAbs = bootstrapCI(deltasAbs);
  const ciPct = bootstrapCI(deltasPct);
  const ciDiDAbs = bootstrapCI(didAbsArr);
  const ciDiDPct = bootstrapCI(didPctArr);

  const overall = {
    games: results.length,
    afterMinutesFixed: AFTER_MIN_FIXED,
    beforeMinutes: opts.beforeMin,
    meanDeltaAbs: avg(deltasAbs),
    medianDeltaAbs: median(deltasAbs),
    meanDeltaPct: avg(deltasPct),
    medianDeltaPct: median(deltasPct),
    meanDeltaLog: avg(deltasLog),
    medianDeltaLog: median(deltasLog),
    weightedPct,
    didMeanAbs: avg(didAbsArr),
    didMedianAbs: median(didAbsArr),
    didMeanPct: avg(didPctArr),
    didMedianPct: median(didPctArr),
    ciMeanDeltaAbs95: ciAbs,
    ciMeanDeltaPct95: ciPct,
    ciMeanDidAbs95: ciDiDAbs,
    ciMeanDidPct95: ciDiDPct,
  } as const;

  const payload = { options: { ...opts, afterMin: AFTER_MIN_FIXED }, overall, results };
  console.log(JSON.stringify(payload, null, 2));

  if (opts.csv) {
    const header = [
      "gameId","startTime","hourOfWeek","beforeMin","afterMin","samplesBefore","samplesAfter",
      "baselineAvg","eventAvg","baselineMedian","eventMedian","peakAfter","minutesToPeak",
      "deltaAbs","deltaPct","deltaLog","controlCount","controlDeltaAbsMean","controlDeltaPctMean","controlDeltaLogMean",
      "didDeltaAbs","didDeltaPct","didDeltaLog"
    ];
    const rows: string[] = [];
    rows.push(header.join(","));
    for (const r of results) {
      rows.push(toCsvRow([
        r.gameId,r.startTime,r.hourOfWeek,r.windowBeforeMin,r.windowAfterMin,r.samplesBefore,r.samplesAfter,
        r.baselineAvg,r.eventAvg,r.baselineMedian,r.eventMedian,r.peakAfter,r.minutesToPeak,
        r.deltaAbs,r.deltaPct,r.deltaLog,r.controlCount,r.controlDeltaAbsMean,r.controlDeltaPctMean,r.controlDeltaLogMean,
        r.didDeltaAbs,r.didDeltaPct,r.didDeltaLog
      ]));
    }
    await fs.mkdir(path.dirname(opts.csv), { recursive: true }).catch(() => {});
    await fs.writeFile(opts.csv, rows.join(""), "utf-8");
  }

  function fmt(n: number | null | undefined, d = 2): string { return (n == null || !Number.isFinite(n)) ? "n/a" : n.toFixed(d); }
  const pos = results.filter(r => (r.deltaAbs ?? 0) > 0).length;
  const neg = results.filter(r => (r.deltaAbs ?? 0) < 0).length;

  const lines = [
    "",
    "==== SUMMARY ====",
    `Games: ${results.length}`,
    `Window: before ${opts.beforeMin}m, after ${AFTER_MIN_FIXED}m`,
    `Mean Δ players: ${fmt(overall.meanDeltaAbs)}  (95% CI ${fmt(overall.ciMeanDeltaAbs95.lo)}, ${fmt(overall.ciMeanDeltaAbs95.hi)})`,
    `Median Δ players: ${fmt(overall.medianDeltaAbs)}`,
    `Weighted % change: ${overall.weightedPct == null ? "n/a" : fmt(overall.weightedPct)}%`,
    `DiD mean Δ players: ${fmt(overall.didMeanAbs)}  (95% CI ${fmt(overall.ciMeanDidAbs95.lo)}, ${fmt(overall.ciMeanDidAbs95.hi)})`,
    `DiD mean %: ${fmt(overall.didMeanPct)}%  (95% CI ${fmt(overall.ciMeanDidPct95.lo)}, ${fmt(overall.ciMeanDidPct95.hi)}%)`,
    `Positive lifts: ${pos}  |  Negative lifts: ${neg}`,
    "==================",
    ""
  ];
  console.log(lines.join(""));
}

main().catch((e) => { console.error(e); process.exit(1); });
