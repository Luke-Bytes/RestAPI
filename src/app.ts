import "./utils/Logger";
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import sanitizeInput from "./middlewares/sanitizeInput";


dotenv.config();

const app = express();

app.use(express.json());
app.use(helmet());
app.use(mongoSanitize());
app.use(sanitizeInput);

const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 500,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/api", apiLimiter);

app.use("/api", routes);

app.use(errorHandler);

export default app;
