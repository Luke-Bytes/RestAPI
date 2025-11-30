import { Router } from "express";
import { getGameParticipationByGameId } from "../controllers/gameParticipationController";

const router = Router();

router.get("/:gameId", getGameParticipationByGameId);

export default router;

