import { Router } from "express";
import playerRoutes from "./playerRoutes";
import queryRoutes from "./queryRoutes";
import seasonRoutes from "./seasonRoutes";
import playerCountRoutes from "./playerCountRoutes";

const router = Router();

router.use("/player", playerRoutes);
router.use("/custom-query", queryRoutes);
router.use("/seasons", seasonRoutes);
router.use("/playerCount", playerCountRoutes);

export default router;
