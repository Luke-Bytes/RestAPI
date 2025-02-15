import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

function getLogFilePath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const filename = `playerCounts-${year}-${month}-${day}.log`;

  const dirPath = path.join(process.cwd(), 'logs', 'playerCounts');
  fs.mkdirSync(dirPath, { recursive: true });

  return path.join(dirPath, filename);
}

async function fetchPlayerCounts() {
  try {
    const url = `https://shotbow.net/serverList.json?t=${new Date().getTime()}`;
    const response = await axios.get(url);
    const data = response.data;

    const dataWithTimestamp = { timestamp: new Date().toISOString(), ...data };
    const logRow = JSON.stringify(dataWithTimestamp) + "\n";

    const filePath = getLogFilePath();
    fs.appendFile(filePath, logRow, (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      }
    });
  } catch (error) {
    console.error('Error fetching player counts from endpoint:', error);
  }
}

function getDelayUntilNextHalfHour(): number {
  const now = new Date();
  let nextRun: Date;
  if (now.getMinutes() < 30) {
    nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 30, 0, 0);
  } else {
    nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
  }
  return nextRun.getTime() - now.getTime();
}

export function schedulePlayerCountFetch() {
  const delay = getDelayUntilNextHalfHour();

  setTimeout(() => {
    fetchPlayerCounts();
    setInterval(fetchPlayerCounts, 30 * 60 * 1000);
  }, delay);
}

export { fetchPlayerCounts };
