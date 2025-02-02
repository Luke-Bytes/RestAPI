import { connectToDatabase } from "../config/database";

export const getPlayerByIGN = async (ignUsed: string, season?: string) => {
  const db = await connectToDatabase();

  const player = await db.collection("Player").findOne({ latestIGN: ignUsed });
  if (!player) {
    console.log(`Player not found for IGN: ${ignUsed}`);
    return null;
  }

  console.log("Found player:", player);

  let seasonId;
  if (!season) {
    const activeSeason = await db.collection("Season").findOne({ isActive: true });
    if (!activeSeason) {
      throw new Error("No active season found");
    }
    console.log(`Using active season with id: ${activeSeason.id}`);
    seasonId = activeSeason.id;
  } else {
    const specificSeason = await db.collection("Season").findOne({ number: parseInt(season) });
    if (!specificSeason) {
      throw new Error(`Season ${season} not found`);
    }
    console.log(`Using specific season with id: ${specificSeason.id}`);
    seasonId = specificSeason.id;
  }

  const playerStats = await db.collection("PlayerStats").findOne({
    playerId: player.id,
    seasonId: seasonId
  });

  if (!playerStats) {
    console.log(`No stats found for player ${ignUsed} in season ${seasonId}`);
    return null;
  }

  console.log("Player stats found:", playerStats);

  return {
    ...player,
    ...playerStats
  };
};
