import { connectToDatabase } from "../config/database";

const API_BASE_URL = "http://localhost:3000/api/seasons";

interface SeasonResponse {
  _id: string;
  number: number;
  name?: string;
  isActive: boolean;
}

export const getPlayerByIGN = async (ignUsed: string, season?: string) => {
  const db = await connectToDatabase();

  const player = await db.collection("Player").findOne({ latestIGN: ignUsed });
  if (!player) {
    console.log(`Player not found for IGN: ${ignUsed}`);
    return null;
  }

  console.log("Found player:", player);

  let seasonId: string;
  try {
    let seasonResponse;
    if (!season) {
      seasonResponse = await fetch(`${API_BASE_URL}?active=true`);
    } else {
      seasonResponse = await fetch(`${API_BASE_URL}/${season}`);
    }

    if (!seasonResponse.ok) {
      throw new Error(
        `Failed to fetch season information: ${seasonResponse.statusText}`
      );
    }

    const seasonData = (await seasonResponse.json()) as SeasonResponse;
    console.log("Season data response from API:", seasonData);

    if (!seasonData || !seasonData._id) {
      throw new Error("No valid season data returned from the endpoint.");
    }

    seasonId = seasonData._id;
    console.log(`Using season with id: ${seasonId}`);
  } catch (error) {
    console.error("Error fetching season information:", error);
    return null;
  }

  const playerStats = await db.collection("PlayerStats").findOne({
    playerId: player.id,
    seasonId: seasonId,
  });

  if (!playerStats) {
    console.error(`PlayerStats not found. Debug info:`);
    console.error(`Queried playerId: ${player.id}`);
    console.error(`Queried seasonId: ${seasonId}`);

    const existingStats = await db.collection("PlayerStats").find({
      playerId: player.id,
    }).toArray();
    console.log(`Existing PlayerStats with playerId:`, existingStats);

    return null;
  }


  console.log("Player stats found:", playerStats);

  return {
    id: player.id,
    discordSnowflake: player.discordSnowflake,
    latestIGN: player.latestIGN,
    primaryMinecraftAccount: player.primaryMinecraftAccount,
    minecraftAccounts: player.minecraftAccounts,
    elo: playerStats.elo,
    wins: playerStats.wins,
    losses: playerStats.losses,
    winStreak: playerStats.winStreak,
    loseStreak: playerStats.loseStreak,
    biggestWinStreak: playerStats.biggestWinStreak,
    biggestLosingStreak: playerStats.biggestLosingStreak,
    seasonId: seasonId,
  };
};
