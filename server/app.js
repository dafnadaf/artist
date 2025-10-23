import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";

import ordersRouter from "./routes/orders.js";
import usersRouter from "./routes/users.js";
import worksRouter from "./routes/works.js";
import shippingRouter from "./routes/shipping.js";
import paymentsRouter from "./routes/payments.js";
import seoRouter from "./routes/seo.js";
import requestId from "./logging/requestId.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const sentryDsn = process.env.SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  });

  app.use(Sentry.Handlers.requestHandler());
}

app.use(requestId);

if (sentryDsn) {
  app.use((request, _response, next) => {
    const hub = Sentry.getCurrentHub();
    if (hub?.getScope() && request.id) {
      hub.getScope().setTag("request_id", request.id);
    }
    next();
  });
}

app.use((request, response, next) => {
  if (request.id) {
    response.setHeader("X-Request-ID", request.id);
  }
  next();
});

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["https://yourdomain.com"];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const corsError = new Error("Origin not allowed");
      corsError.status = 403;
      callback(corsError);
    },
    credentials: true,
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https:"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", "https://api.yookassa.ru", "https://firestore.googleapis.com"],
        "frame-ancestors": ["'none'"],
        "upgrade-insecure-requests": [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }),
);

app.use(compression());
app.use(express.json({ limit: "1mb" }));

morgan.token("id", (request) => request.id || "-");
app.use(morgan(":id :remote-addr :method :url :status :res[content-length] - :response-time ms"));

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

const paymentsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const shippingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", generalLimiter);
app.use(["/api/orders", "/api/users", "/api/works"], mutationLimiter);
app.use("/api/payments", paymentsLimiter);
app.use("/api/shipping", shippingLimiter);

app.get("/api/health", (request, response) => {
  response.json({ status: "ok" });
});

app.use(seoRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);
app.use("/api/works", worksRouter);
app.use("/api/shipping", shippingRouter);
app.use("/api/payments", paymentsRouter);

app.use((request, response) => {
  response.status(404).json({ message: "Not found" });
});

if (sentryDsn) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

export default app;
