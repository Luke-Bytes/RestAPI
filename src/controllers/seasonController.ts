import { Request, Response } from "express";
import { connectToDatabase } from "../config/database";

export const getSeasons = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { active } = req.query;

  try {
    const db = await connectToDatabase();

    if (active === "true") {
      // Find the active season
      const activeSeason = await db
        .collection("Season")
        .findOne({ isActive: true });
      if (activeSeason) {
        res.json(activeSeason);
      } else {
        res.status(404).json({ message: "No active season found" });
      }
    } else {
      // Find all seasons
      const seasons = await db.collection("Season").find({}).toArray();
      res.json(seasons);
    }
  } catch (err) {
    console.error("Error fetching seasons:", err);
    res.status(500).json({ message: "Failed to fetch seasons" });
  }
};

export const getSeasonByNumber = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { number } = req.params;

  try {
    const db = await connectToDatabase();
    const season = await db
      .collection("Season")
      .findOne({ number: parseInt(number) });

    if (season) {
      res.json(season);
    } else {
      res.status(404).json({ message: `Season ${number} not found` });
    }
  } catch (err) {
    console.error(`Error fetching season ${number}:`, err);
    res.status(500).json({ message: "Failed to fetch the season" });
  }
};
