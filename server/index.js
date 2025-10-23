import mongoose from "mongoose";
import app from "./app.js";
import { startShippingRefreshJob } from "./jobs/shippingRefreshJob.js";

mongoose.set("strictQuery", true);

const port = Number(process.env.PORT) || 4000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/artist";

async function start() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    app.listen(port, () => {
      console.info(`API server listening on port ${port}`);
    });
    startShippingRefreshJob();
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  start();
}

export default app;
