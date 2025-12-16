import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { getErrorMessage } from "../utils/Utils";
import cache from "../utils/Cache";

const MAX_RAW_DAYS = 31;

const extractMetrics = (e: any): Record<string, number> => {
  const out: Record<string, number> = {};

  for (const [k, v] of Object.entries(e)) {
    if (k === "timestamp" || k === "counts") continue;
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n)) out[k] = n;
  }

  if (e && typeof e.counts === "object" && e.counts !== null) {
    for (const [k, v] of Object.entries(e.counts)) {
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
      if (Number.isFinite(n)) out[k] = n;
    }
  }
  if (Object.keys(out).length === 0 && e?.count != null) {
    const n = Number(e.count);
    if (Number.isFinite(n)) out.count = n;
  }
  return out;
};
export const getPlayerCount = async (req: Request, res: Response): Promise<void> => {
  const { start, end, date } = req.query;
  let startTime: Date;
  let endTime: Date;

  if (date) {
    startTime = new Date(date as string);
    startTime.setHours(0, 0, 0, 0);
    endTime = new Date(date as string);
    endTime.setHours(23, 59, 59, 999);
  } else if (start || end) {
    startTime = start ? new Date(start as string) : new Date(0);
    startTime.setHours(0, 0, 0, 0);
    endTime = end ? new Date(end as string) : new Date();
    endTime.setHours(23, 59, 59, 999);
  } else {
    endTime = new Date();
    endTime.setHours(23, 59, 59, 999);
    startTime = new Date(endTime);
    startTime.setDate(endTime.getDate() - (MAX_RAW_DAYS - 1));
    startTime.setHours(0, 0, 0, 0);
  }

  const now = new Date();
  if (endTime > now) endTime = now;
  if (startTime > endTime) {
    res.status(400).json({ message: "start must be <= end" });
    return;
  }

  const rangeDays = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
  const aggregated = rangeDays > MAX_RAW_DAYS;

  const cacheKey = `playerCounts-${startTime.toISOString()}-${endTime.toISOString()}-${aggregated ? "day" : "30m"}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const logDir = path.join(process.cwd(), "playerCounts");
    const logFiles: string[] = await glob(`${logDir}/*.log.gz`);

    let allData: any[] = [];
    const gunzipAsync = promisify(gunzip);
    for (const file of logFiles) {
      const compressed = await fs.readFile(file);
      const content = await gunzipAsync(compressed);
      const lines = content
        .toString("utf-8")
        .split("\n")
        .filter((line: string) => line.trim() !== "");
      const parsedData = lines
        .map((line: string) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((entry) => entry !== null);
      allData.push(...parsedData);
    }

    const filtered = allData.filter((entry: any) => {
      const ts = new Date(entry.timestamp);
      return ts >= startTime && ts <= endTime;
    });

    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let data: Array<Record<string, any>>;
    if (aggregated) {
      const byDay = new Map<number, Record<string, number>>();
      for (const e of filtered) {
        const d = new Date(e.timestamp);
        d.setHours(0, 0, 0, 0);
        const key = d.getTime();
        const metrics = extractMetrics(e);
        const existing = byDay.get(key) ?? {};
        for (const [k, v] of Object.entries(metrics)) {
          existing[k] = Math.max(existing[k] ?? 0, v as number);
        }
        byDay.set(key, existing);
      }
      data = Array.from(byDay.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([k, m]) => ({ timestamp: new Date(k).toISOString(), ...m }));
    } else {
      const buckets = new Map<number, Record<string, number>>();
      for (const e of filtered) {
        const d = new Date(e.timestamp);
        d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0);
        const key = d.getTime();
        const metrics = extractMetrics(e);
        const existing = buckets.get(key) ?? {};
        for (const [k, v] of Object.entries(metrics)) {
          existing[k] = Math.max(existing[k] ?? 0, v as number);
        }
        buckets.set(key, existing);
      }
      data = Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([k, m]) => ({ timestamp: new Date(k).toISOString(), ...m }));
    }

    const payload = {
      meta: {
        aggregated,
        granularity: aggregated ? "day" : "30m",
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        points: data.length,
        rangeDays,
      },
      data,
    };

    cache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: getErrorMessage(err) });
  }
};
