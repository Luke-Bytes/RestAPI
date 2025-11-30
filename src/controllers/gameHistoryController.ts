import { Request, Response, NextFunction } from "express";
import { connectToDatabase } from "../config/database";

export const getGameHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const seasonParam = typeof req.query.season === "string" ? req.query.season : undefined;

  try {
    const db = await connectToDatabase();

    let season: { _id: string; number?: number } | null = null;
    if (seasonParam) {
      const seasonNumber = parseInt(seasonParam, 10);
      if (Number.isNaN(seasonNumber)) {
        return void res.status(400).json({ message: "season must be a number" });
      }
      season = await db.collection("Season").findOne<{ _id: string; number: number }>({ number: seasonNumber });
      if (!season) {
        return void res.status(404).json({ message: `Season ${seasonNumber} not found` });
      }
    } else {
      season = await db.collection("Season").findOne<{ _id: string }>({ isActive: true });
      if (!season) {
        season = await db
          .collection("Season")
          .find<{ _id: string; number: number }>({})
          .sort({ number: -1 })
          .limit(1)
          .next();
      }
      if (!season) {
        return void res.status(404).json({ message: "No seasons found" });
      }
    }

    const games = await db
      .collection("Game")
      .find({ seasonId: season._id })
      .toArray();

    res.json(games);
  } catch (err) {
    console.error("Error fetching game history:", err);
    next(err);
  }
};
