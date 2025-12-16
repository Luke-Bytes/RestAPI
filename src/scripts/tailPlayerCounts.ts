import path from "node:path";
import fs from "node:fs/promises";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { glob } from "glob";

const gunzipAsync = promisify(gunzip);

async function findLatestFile(dir: string): Promise<string | null> {
  const files = await glob(`${dir}/*.log.gz`);
  if (files.length === 0) return null;

  const stats = await Promise.all(
    files.map(async (file) => {
      const stat = await fs.stat(file);
      return { file, mtime: stat.mtime.getTime() };
    })
  );

  stats.sort((a, b) => b.mtime - a.mtime);
  return stats[0].file;
}

async function printLatestLog(linesToShow = 300) {
  const dir = path.join(process.cwd(), "playerCounts");
  const latest = await findLatestFile(dir);
  if (!latest) {
    console.log("No player count archives found in playerCounts/.");
    return;
  }

  const compressed = await fs.readFile(latest);
  const content = await gunzipAsync(compressed);
  const lines = content
    .toString("utf-8")
    .trimEnd()
    .split("\n");

  const tail = lines.slice(-linesToShow);
  console.log(`--- Latest player count file: ${latest} (last ${tail.length} lines) ---`);
  console.log(tail.join("\n"));
}

printLatestLog().catch((err) => {
  console.error("Failed to read latest player count archive:", err);
  process.exitCode = 1;
});
