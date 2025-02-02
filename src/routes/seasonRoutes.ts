import { Router } from "express";
import { getSeasons } from "../controllers/seasonController";

const router = Router();

router.get("/:season", getSeasons);

export default router;
