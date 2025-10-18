/* eslint-env node */
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import ordersRouter from "./routes/orders.js";
import usersRouter from "./routes/users.js";
import worksRouter from "./routes/works.js";

mongoose.set("strictQuery", true);

const app = express();

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const mutationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
  : undefined;

app.use(
  cors({
    origin: allowedOrigins || true,
    credentials: true,
  }),
);
app.use(express.json());
app.use("/api/", generalLimiter);
app.use(["/api/orders", "/api/users", "/api/works"], mutationLimiter);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/api/health", (request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);
app.use("/api/works", worksRouter);

app.use((request, response) => {
  response.status(404).json({ message: "Not found" });
});

app.use((error, request, response, _next) => {
  void _next;
  console.error(error);
  const status = error.status || 500;
  response.status(status).json({ message: error.message || "Internal server error" });
});

const port = Number(process.env.PORT) || 4000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/artist";

async function start() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    app.listen(port, () => {
      console.info(`API server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  start();
}

export default app;
