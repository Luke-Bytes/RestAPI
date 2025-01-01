import { Router } from "express";
import { getPlayer } from "../controllers/playerController";

const router = Router();

router.get("/:ignUsed", getPlayer);

export default router;
