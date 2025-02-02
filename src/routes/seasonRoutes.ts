import { Router } from "express";
import { getSeasonByNumber, getSeasons } from "../controllers/seasonController";

const router = Router();

router.get("/", getSeasons);
router.get("/:number", getSeasonByNumber);

export default router;
