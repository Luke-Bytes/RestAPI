import { Router } from "express";
import playerRoutes from "./playerRoutes";
import queryRoutes from "./queryRoutes";
import seasonRoutes from "./seasonRoutes";
import playerCountRoutes from "./playerCountRoutes";
import eloHistoryRoutes from "./eloHistoryRoutes";

const router = Router();

router.use("/player", playerRoutes);
router.use("/custom-query", queryRoutes);
router.use("/seasons", seasonRoutes);
router.use("/playerCount", playerCountRoutes);
router.use("/elohistory", eloHistoryRoutes);

export default router;
