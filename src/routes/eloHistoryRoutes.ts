import { Router } from "express";
import { getEloHistory } from "../controllers/eloHistoryController";

const router = Router();

// GET /api/elohistory/:ignUsed?season=1
router.get("/:ignUsed", getEloHistory);

export default router;
