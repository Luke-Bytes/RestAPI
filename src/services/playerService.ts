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
  const player = await db.collection("Player").findOne({
    latestIGN: new RegExp(`^${ignUsed}$`, "i"),
  });

  if (!player) {
    console.error(`Player not found for IGN: ${ignUsed}`);
    return null;
  }

  const playerId = player._id.toString();

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

    if (!seasonData || !seasonData._id) {
      throw new Error("No valid season data returned from the endpoint.");
    }

    seasonId = seasonData._id;
  } catch (error) {
    console.error("Error fetching season information:", error);
    return null;
  }

  const playerStats = await db.collection("PlayerStats").findOne({
    playerId: playerId,
    seasonId: seasonId,
  });

  if (!playerStats) {
    console.error(`PlayerStats not found. Debug info:`);
    console.error(`Queried playerId: ${playerId}`);
    console.error(`Queried seasonId: ${seasonId}`);
    return null;
  }

  return {
    id: player._id,
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
