import { Request, Response } from "express";
import { connectToDatabase } from "../config/database";

export const getSeasons = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = await connectToDatabase();
    const seasons = await db.collection("Season").find({}).toArray();
    res.json(seasons);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch seasons" });
  }
};
