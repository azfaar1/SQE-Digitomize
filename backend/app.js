// backend/app.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Import route modules (these should *only* export routers — avoid heavy side effects at top-level)
import contestRoutes from "./contest/routes/contestRoutes.js";
import communityRoutes from "./community/routes/communityRoutes.js";
import userRoutes from "./users/routes/userRoutes.js";
import adminRoutes from "./users/routes/adminRoutes.js";
import sheetRoutes from "./DSA_sheets/routes/sheetRoutes.js";
import questionRoutes from "./DSA_sheets/routes/questionRoutes.js";
import potdRoutes from "./potd/routes/potdRoutes.js";
import hackathonRoutes from "./hackathons/routes/hackathonRoutes.js";

import { routeLogging } from "./users/middlewares/authMiddleware.js";

const app = express();

// CORS & body parsing
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(bodyParser.json());

// Apply route logging only in production (optional)
if (process.env.NODE_ENV === "production") {
  app.use(routeLogging);
}

// Mount routers (these should be plain Express routers)
app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/sheets", sheetRoutes);
app.use("/questions", questionRoutes);
app.use("/potd", potdRoutes);
app.use("/contests", contestRoutes);
app.use("/community", communityRoutes);
app.use("/hackathons", hackathonRoutes);

// 404 handler
app.all("*", (req, res) => {
  res.status(404).json({ error: `${req.originalUrl} route not found` });
});

export default app;
