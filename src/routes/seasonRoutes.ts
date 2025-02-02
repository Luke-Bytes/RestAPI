import { Router } from "express";
import { getSeasons } from "../controllers/seasonController";

const router = Router();

router.get("/", getSeasons);

export default router;
