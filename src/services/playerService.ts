import { connectToDatabase } from "../config/database";

const API_BASE_URL = "http://localhost:3000/api/seasons";

interface SeasonResponse {
  id: string;
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
      throw new Error(`Failed to fetch season information: ${seasonResponse.statusText}`);
    }

    const seasonData: any = await seasonResponse.json();
    console.log("Season data response from API:", seasonData);

    if (Array.isArray(seasonData) && seasonData.length > 0) {
      seasonId = seasonData[0].id;
    } else if (seasonData && seasonData.id) {
      seasonId = seasonData.id;
    } else {
      throw new Error("No valid season data returned from the endpoint.");
    }

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
    console.log(`No stats found for player ${ignUsed} in season ${seasonId}`);
    return null;
  }

  console.log("Player stats found:", playerStats);

  return {
    ...player,
    ...playerStats,
  };
};
