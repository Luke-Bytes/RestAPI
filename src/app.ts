import cors from "cors";
import "./utils/Logger";
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import sanitizeInput from "./middlewares/sanitizeInput";
import * as path from "node:path";
import { schedulePlayerCountFetch } from "./ajax/playerCount";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          "http://anniwars.win",
          "https://anniwars.win",
          "http://www.anniwars.win",
          "https://www.anniwars.win",
        ],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);
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

app.use(express.static(path.join(__dirname, "../src//public")));

app.use("/api", routes);

app.get("/playerCount", (req, res) => {
  res.sendFile(path.join(__dirname, "../src/public/playerCount.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../src/public/index.html"));
});

app.use(errorHandler);

schedulePlayerCountFetch();

export default app;
