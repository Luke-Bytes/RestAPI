import { Request, Response } from "express";
import { getPlayerByIGN } from "../services/playerService";
import { getErrorMessage } from "../utils/Utils";
import cache from "../utils/Cache";

export const getPlayer = async (req: Request, res: Response): Promise<void> => {
  const { ignUsed } = req.params;
  const season =
    typeof req.query.season === "string" ? req.query.season : undefined;

  console.log("Request parameter ignUsed:", ignUsed);
  console.log("Season parameter:", season);

  try {
    const cacheKey = `${ignUsed}-${season ?? "active"}`;
    const cachedPlayer = cache.get(cacheKey);
    if (cachedPlayer) {
      console.log("Cache hit for player:", ignUsed);
      res.json(cachedPlayer);
      return;
    }

    console.log("Cache miss for player:", ignUsed);

    const player = await getPlayerByIGN(ignUsed, season);
    if (!player) {
      console.log("Player not found in the database.");
      res.status(404).json({ message: "Player not found" });
      return;
    }

    cache.set(cacheKey, player);
    res.json(player);
  } catch (err) {
    console.error("Error fetching player:", err);
    res.status(500).json({
      message: "Internal Server Error",
      error: getErrorMessage(err),
    });
  }
};
