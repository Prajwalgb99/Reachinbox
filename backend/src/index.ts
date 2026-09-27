import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { env } from "./config/env";
import { authRouter } from "./auth/googleAuth";
import { slackRouter } from "./slack/slackOAuth";
import { emailRouter } from "./routes/email.routes";
import { sendersRouter } from "./routes/senders.routes";
import { emailQueue, reconcilePendingJobs } from "./queue/emailQueue";
import { ensureIndex } from "./search/elasticsearch";
import "./queue/emailWorker"; // starts the worker in-process for local/dev convenience

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === env.frontendUrl ||
        origin.includes("localhost") ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Live BullMQ dashboard, mounted at /admin/queues, per the assignment's
// "expose a live BullMQ dashboard for real-time queue visibility" requirement.
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  // Cast: @bull-board ships its own bundled BullMQ type version which can
  // drift slightly from the app's own `bullmq` dependency's Job typings.
  // The adapter is functionally compatible at runtime.
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter,
});
app.use("/admin/queues", serverAdapter.getRouter());

app.use("/api/auth", authRouter);
app.use("/api/slack", slackRouter);
app.use("/api/emails", emailRouter);
app.use("/api/senders", sendersRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

async function start() {
  try {
    await ensureIndex();
  } catch (err) {
    console.error("Could not reach Elasticsearch at boot (will keep retrying on demand):", err);
  }

  try {
    await reconcilePendingJobs();
  } catch (err) {
    console.error("Could not reconcile pending jobs at boot:", err);
  }

  app.listen(env.port, () => {
    console.log(`ReachInbox scheduler API listening on http://localhost:${env.port}`);
    console.log(`Bull-Board dashboard: http://localhost:${env.port}/admin/queues`);
  });
}

start();
