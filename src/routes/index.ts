import { Router } from "express";
import playerRoutes from "./playerRoutes";
import queryRoutes from "./queryRoutes";

const router = Router();

router.use("/player", playerRoutes);
router.use("/custom-query", queryRoutes);

export default router;
