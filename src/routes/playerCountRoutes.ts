import { Router } from "express";
import { getPlayerCount } from "../controllers/playerCountController";

const router = Router();

router.get("/", getPlayerCount);

export default router;
