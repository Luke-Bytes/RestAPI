import { connectToDatabase } from "../config/database";

export const getPlayerByIGN = async (ignUsed: string, season?: string) => {
  const db = await connectToDatabase();
  console.log("Querying for IGN:", ignUsed);

  let seasonId;
  if (!season) {
    const activeSeason = await db
      .collection("Season")
      .findOne({ isActive: true });
    if (!activeSeason) {
      throw new Error("No active season found");
    }
    seasonId = activeSeason.id;
  } else {
    const specificSeason = await db
      .collection("Season")
      .findOne({ number: parseInt(season) });
    if (!specificSeason) {
      throw new Error(`Season ${season} not found`);
    }
    seasonId = specificSeason.id;
  }

  const result = await db.collection("PlayerStats").findOne({
    playerId: (await db.collection("Player").findOne({ latestIGN: ignUsed }))
      ?.id,
    seasonId: seasonId,
  });

  console.log("Query result:", JSON.stringify(result, null, 2));
  return result;
};
