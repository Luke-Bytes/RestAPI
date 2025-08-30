import { Router } from "express";
import { getGameHistory } from "../controllers/gameHistoryController";

const router = Router();

router.get("/", getGameHistory);

export default router;

