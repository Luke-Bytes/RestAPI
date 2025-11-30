import { Db } from "mongodb";
import { connectToDatabase } from "../config/database";
import { escapeRegex } from "../utils/Utils";

interface EloPoint {
  createdAt: Date;
  elo: number;
}

export async function fetchEloHistory(
  latestIGN: string,
  seasonNumber?: string
): Promise<EloPoint[]> {
  const db: Db = await connectToDatabase();

  const ignRegex = new RegExp(`^${escapeRegex(latestIGN)}$`, "i");
  const player = await db
    .collection<{ _id: string }>("Player")
    .findOne({ latestIGN: ignRegex });

  if (!player) {
    throw new Error(`Player '${latestIGN}' not found`);
  }

  let seasonFilter: { [key: string]: any };
  if (seasonNumber) {
    const season = await db
      .collection("Season")
      .findOne<{ _id: string; number: number }>({
        number: parseInt(seasonNumber, 10),
      });
    if (!season) throw new Error(`Season ${seasonNumber} not found`);
    seasonFilter = { seasonId: season._id };
  } else {
    const activeSeason = await db
      .collection("Season")
      .findOne<{ _id: string }>({ isActive: true });
    if (!activeSeason) throw new Error("No active season found");
    seasonFilter = { seasonId: activeSeason._id };
  }

  const raw = await db
    .collection("EloHistory")
    .find<{ createdAt: Date; elo: number }>({
      playerId: player._id,
      ...seasonFilter,
    })
    .sort({ createdAt: 1 })
    .toArray();

  return raw.map(({ createdAt, elo }) => ({ createdAt, elo }));
}
