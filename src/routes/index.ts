import { Router } from "express";
import playerRoutes from "./playerRoutes";
import queryRoutes from "./queryRoutes";
import seasonRoutes from "./seasonRoutes";
import playerCountRoutes from "./playerCountRoutes";
import eloHistoryRoutes from "./eloHistoryRoutes";
import gameHistoryRoutes from "./gameHistoryRoutes";
import gameParticipationRoutes from "./gameParticipationRoutes";

const router = Router();

router.use("/player", playerRoutes);
router.use("/custom-query", queryRoutes);
router.use("/seasons", seasonRoutes);
router.use("/playerCount", playerCountRoutes);
router.use("/elohistory", eloHistoryRoutes);
router.use("/gameHistory", gameHistoryRoutes);
router.use("/gameParticipation", gameParticipationRoutes);

export default router;
