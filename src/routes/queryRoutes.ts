import { Router } from "express";
import { customQuery } from "../controllers/queryController";
import { validateQueryMiddleware } from "../middlewares/validateQuery";

const router = Router();

router.post("/", validateQueryMiddleware, customQuery);

export default router;
