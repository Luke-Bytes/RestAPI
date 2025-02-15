import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { getErrorMessage } from "../utils/Utils";
import cache from "../utils/Cache";

export const getPlayerCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { start, end, date } = req.query;
  let startTime: Date;
  let endTime: Date;

  if (date) {
    startTime = new Date(date as string);
    startTime.setHours(0, 0, 0, 0);
    endTime = new Date(date as string);
    endTime.setHours(23, 59, 59, 999);
  } else {
    if (start) {
      startTime = new Date(start as string);
      startTime.setHours(0, 0, 0, 0);
    } else {
      startTime = new Date(0);
    }
    if (end) {
      endTime = new Date(end as string);
      endTime.setHours(23, 59, 59, 999);
    } else {
      endTime = new Date();
    }
  }

  const cacheKey = `playerCounts-${startTime.toISOString()}-${endTime.toISOString()}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log("Cache hit for player counts", cacheKey);
    res.json(cachedData);
    return;
  }

  try {
    const logDir = path.join(process.cwd(), "logs", "playerCounts");

    const logFiles: string[] = await glob(`${logDir}/*.log`);

    let allData: any[] = [];

    for (const file of logFiles) {
      const content = await fs.readFile(file, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim() !== "");
      const parsedData = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (err) {
            console.error(`Error parsing line in ${file}: ${line}`, err);
            return null;
          }
        })
        .filter((entry) => entry !== null);
      allData.push(...parsedData);
    }

    const filteredData = allData.filter((entry) => {
      const timestamp = new Date(entry.timestamp);
      return timestamp >= startTime && timestamp <= endTime;
    });

    filteredData.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    cache.set(cacheKey, filteredData);
    res.json(filteredData);
  } catch (err) {
    console.error("Error fetching player counts:", err);
    res.status(500).json({
      message: "Internal Server Error",
      error: getErrorMessage(err),
    });
  }
};
