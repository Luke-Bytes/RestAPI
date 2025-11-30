import { Request, Response, NextFunction } from "express";
import { connectToDatabase } from "../config/database";

export const getGameParticipationByGameId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { gameId } = req.params;

  if (!gameId || typeof gameId !== "string") {
    res.status(400).json({ message: "gameId is required" });
    return;
  }

  try {
    const db = await connectToDatabase();
    const entries = await db
      .collection("GameParticipation")
      .find({ gameId })
      .toArray();

    res.json(entries);
  } catch (err) {
    console.error("Error fetching game participation by gameId:", err);
    next(err);
  }
};

