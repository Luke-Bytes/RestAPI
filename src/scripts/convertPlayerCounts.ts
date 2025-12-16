import path from "node:path";
import { createReadStream, createWriteStream, mkdirSync, rmSync } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { glob } from "glob";

const pipelineAsync = promisify(pipeline);

async function convertLegacyLogs() {
  const legacyDir = path.join(process.cwd(), "logs", "playerCounts");
  const targetDir = path.join(process.cwd(), "playerCounts");
  mkdirSync(targetDir, { recursive: true });

  const legacyFiles = await glob(`${legacyDir}/*.log`);

  if (legacyFiles.length === 0) {
    console.log("No legacy player count logs found to convert.");
    return;
  }

  for (const file of legacyFiles) {
    const basename = path.basename(file, ".log");
    const targetFile = path.join(targetDir, `${basename}.log.gz`);

    try {
      await pipelineAsync(createReadStream(file), createGzip(), createWriteStream(targetFile));
      rmSync(file);
      console.log(`Converted ${file} -> ${targetFile}`);
    } catch (err) {
      console.error(`Failed to convert ${file}:`, err);
    }
  }
}

convertLegacyLogs().catch((err) => {
  console.error("Unexpected error converting player count logs:", err);
  process.exitCode = 1;
});
