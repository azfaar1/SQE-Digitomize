// backend/index.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import admin from "firebase-admin";
import app from "./app.js";
import fetchContestsData from "./fetchContests.js";
import dataSyncer from "./contest/controllers/DataSyncController.js";
import contestSyncer from "./contest/controllers/contestController.js";
import hackathonAPISyncer from "./hackathons/controllers/hackathonApiSyncController.js";
import hackathonDBSyncer from "./hackathons/controllers/hackathonDbSyncController.js";

let appServer;

/**
 * Initialize Firebase only when needed (not in test environment).
 * FIREBASE_CREDENTIALS expected to be a JSON string in env (same as your .env).
 */
async function setupFirebaseIfNeeded() {
  if (!process.env.FIREBASE_CREDENTIALS) {
    console.log("No FIREBASE_CREDENTIALS found — skipping Firebase init");
    return;
  }

  try {
    const firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({
      credential: admin.credential.cert(firebaseCredentials),
    });
    console.log("Firebase initialized");
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
  }
}

/**
 * Initialize syncers and scheduled tasks.
 * These should be skipped in tests because they make network calls / long-running timers.
 */
async function initializeSyncersIfNeeded() {
  try {
    // Safe guard: call syncers only when not in test environment
    if (process.env.NODE_ENV === "test") {
      console.log("NODE_ENV=test -> skipping syncers and scheduled jobs");
      return;
    }

    // Try to fetch initial contests data (your original main() ping)
    try {
      await fetchContestsData();
    } catch (err) {
      console.error("fetchContestsData error:", err);
    }

    // contests sync
    if (dataSyncer && typeof dataSyncer.syncContests === "function") {
      await dataSyncer.syncContests();
      setInterval(dataSyncer.syncContests, 90 * 60 * 1000);
    } else {
      console.warn("dataSyncer.syncContests not available");
    }

    if (contestSyncer && typeof contestSyncer.updateContests === "function") {
      await contestSyncer.updateContests();
      setInterval(contestSyncer.updateContests, 60 * 60 * 1000);
    } else {
      console.warn("contestSyncer.updateContests not available");
    }

    // hackathon syncers
    if (hackathonAPISyncer && typeof hackathonAPISyncer.syncHackathons === "function") {
      await hackathonAPISyncer.syncHackathons();
      setInterval(hackathonAPISyncer.syncHackathons, 90 * 60 * 1000);
    } else {
      console.warn("hackathonAPISyncer.syncHackathons not available");
    }

    if (hackathonDBSyncer && typeof hackathonDBSyncer.updateHackathons === "function") {
      await hackathonDBSyncer.updateHackathons();
      setInterval(hackathonDBSyncer.updateHackathons, 60 * 60 * 1000);
    } else {
      console.warn("hackathonDBSyncer.updateHackathons not available");
    }
  } catch (err) {
    console.error("Error initializing syncers:", err);
  }
}

async function start() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URL || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digitomize";
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected.");

    // Only initialize Firebase and syncers if NOT running tests
    if (process.env.NODE_ENV !== "test") {
      await setupFirebaseIfNeeded();
      await initializeSyncersIfNeeded();
    } else {
      console.log("Running in test mode - external initializations skipped.");
    }

    // Start the HTTP server (in test environment you usually will NOT import this file)
    const port = process.env.PORT || 4001;
    appServer = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

start();

// global unhandled rejection handler to shutdown gracefully
process.on("unhandledRejection", (err) => {
  console.log(`UnhandledRejection: ${err?.message || err}`);
  console.log("Shutting down server due to unhandled rejection");
  if (appServer) {
    appServer.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// uncaught exception handler
process.on("uncaughtException", (err) => {
  console.log(`UncaughtException: ${err?.message || err}`);
  console.log("Shutting down due to uncaught exception");
  process.exit(1);
});
