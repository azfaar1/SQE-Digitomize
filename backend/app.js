// backend/app.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import route modules
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
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://sqe-digitomize-production.up.railway.app', 'https://sqe-digitomize.up.railway.app']
  : ['http://localhost:5173'];

// CORS & body parsing
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // List of allowed origins
      const allowedOrigins = [
        'http://localhost:5173',  // Local development
        'http://localhost:5174',  // Alternative port
        'https://sqe-digitomize-production.up.railway.app',
        'https://sqe-digitomize.up.railway.app',
      ];
      
      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // For development, you might want to be more permissive
      if (process.env.NODE_ENV === 'development') {
        console.log(`Allowing origin in development: ${origin}`);
        return callback(null, true);
      }
      
      // If not allowed
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(bodyParser.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Apply route logging only in production (optional)
// if (process.env.NODE_ENV === "production") {
//   app.use(routeLogging);
// }

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString() 
  });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    message: 'Backend is running',
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    hasStaticPath: process.env.NODE_ENV === 'production'
  });
});

// Mount API routers
app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/sheets", sheetRoutes);
app.use("/questions", questionRoutes);
app.use("/potd", potdRoutes);
app.use("/contests", contestRoutes);
app.use("/community", communityRoutes);
app.use("/hackathons", hackathonRoutes);

// Serve static files from React in production
if (process.env.NODE_ENV === 'production') {
  // IMPORTANT: Check which build folder your React creates
  // For Vite: '../client/dist'
  // For Create React App: '../client/build'
  const staticPath = path.join(__dirname, '../client/dist');
  
  console.log('Production mode: Serving static files from', staticPath);
  
  // Serve static files from the React build
  app.use(express.static(staticPath));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  // Development 404 handler
  app.all("*", (req, res) => {
    res.status(404).json({ error: `${req.originalUrl} route not found` });
  });
}

export default app;