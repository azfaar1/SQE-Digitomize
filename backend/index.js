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

async function initializeSyncersIfNeeded() {
  try {
    if (process.env.NODE_ENV === "test") {
      console.log("NODE_ENV=test -> skipping syncers and scheduled jobs");
      return;
    }

    // Try to fetch initial contests data
    try {
      await fetchContestsData();
    } catch (err) {
      console.error("fetchContestsData error:", err);
    }

    // contests sync - don't wait for these to complete before starting server
    if (dataSyncer && typeof dataSyncer.syncContests === "function") {
      dataSyncer.syncContests().catch(err => console.error('syncContests error:', err));
      setInterval(() => {
        dataSyncer.syncContests().catch(err => console.error('syncContests interval error:', err));
      }, 90 * 60 * 1000);
    }

    if (contestSyncer && typeof contestSyncer.updateContests === "function") {
      contestSyncer.updateContests().catch(err => console.error('updateContests error:', err));
      setInterval(() => {
        contestSyncer.updateContests().catch(err => console.error('updateContests interval error:', err));
      }, 60 * 60 * 1000);
    }

    // hackathon syncers
    if (hackathonAPISyncer && typeof hackathonAPISyncer.syncHackathons === "function") {
      hackathonAPISyncer.syncHackathons().catch(err => console.error('syncHackathons error:', err));
      setInterval(() => {
        hackathonAPISyncer.syncHackathons().catch(err => console.error('syncHackathons interval error:', err));
      }, 90 * 60 * 1000);
    }

    if (hackathonDBSyncer && typeof hackathonDBSyncer.updateHackathons === "function") {
      hackathonDBSyncer.updateHackathons().catch(err => console.error('updateHackathons error:', err));
      setInterval(() => {
        hackathonDBSyncer.updateHackathons().catch(err => console.error('updateHackathons interval error:', err));
      }, 60 * 60 * 1000);
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
    console.log("NODE_ENV:", process.env.NODE_ENV || 'not set');

    // Only initialize Firebase and syncers if NOT running tests
    if (process.env.NODE_ENV !== "test") {
      await setupFirebaseIfNeeded();
      // Don't await syncers - start server immediately
      initializeSyncersIfNeeded().catch(err => {
        console.error("Background syncer initialization error:", err);
      });
    } else {
      console.log("Running in test mode - external initializations skipped.");
    }

    // Start the HTTP server
    const port = process.env.PORT || 4001;
    appServer = app.listen(port, () => {
      console.log(`Server listening on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    });

  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server...');
  if (appServer) {
    appServer.close(() => {
      console.log('HTTP server closed');
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on("unhandledRejection", (err) => {
  console.log(`UnhandledRejection: ${err?.message || err}`);
});

process.on("uncaughtException", (err) => {
  console.log(`UncaughtException: ${err?.message || err}`);
  process.exit(1);
});