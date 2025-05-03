import { NextFunction, Request, Response } from "express";
import { fetchEloHistory } from "../services/eloHistoryService";

export const getEloHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { ignUsed } = req.params;
  const seasonParam =
    typeof req.query.season === "string" ? req.query.season : undefined;

  try {
    const history = await fetchEloHistory(ignUsed, seasonParam);
    if (!history.length) {
      return void res.status(404).json({ message: "No Elo history found." });
    }
    res.json(history);
  } catch (err) {
    console.error("Error fetching Elo history:", err);
    next(err);
  }
};
