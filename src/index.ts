import express, { Application, Request, Response } from "express";
import cors from "cors";
import { connectDatabase } from "./config/database";
import config from "./config";
import authRoutes from "./routes/auth.routes";
import paymentRoutes from "./routes/wallet.routes";
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
} from "./middleware/errorHandler";

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "Google Sign-In & Paystack Payment API",
    version: "1.0.0",
    status: "healthy",
    endpoints: {
      auth: {
        googleSignIn: "GET /auth/google",
        googleCallback: "GET /auth/google/callback",
      },
      wallet: {
        initiate: "POST /wallet/paystack/initiate",
        webhook: "POST /wallet/paystack/webhook",
        status: "GET /wallet/:reference/status",
      },
    },
  });
});

// Routes
app.use("/auth", authRoutes);
app.use("/wallet", paymentRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Base URL: ${config.appBaseUrl}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`\nReady to accept requests`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
