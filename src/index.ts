import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { connectDatabase } from "./config/database";
import config from "./config";
import { swaggerSpec } from "./config/swagger";
import authRoutes from "./routes/auth.routes";
import paymentRoutes from "./routes/wallet.routes";
import keyRoutes from "./routes/key.routes";
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
    documentation: `${config.appBaseUrl}/api-docs`,
    endpoints: {
      auth: {
        googleSignIn: "GET /auth/google",
        googleCallback: "GET /auth/google/callback",
      },
      wallet: {
        deposit: "POST /wallet/deposit",
        webhook: "POST /wallet/paystack/webhook",
        status: "GET /wallet/deposit/:reference/status",
        balance: "GET /wallet/balance",
        transfer: "POST /wallet/transfer",
        transactions: "GET /wallet/transactions",
      },
      keys: {
        create: "POST /keys/create",
        rollover: "POST /keys/rollover",
        revoke: "POST /keys/revoke",
      },
    },
  });
});

// Swagger API Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Paystack Wallet Service API",
    customCss: ".swagger-ui .topbar { display: none }",
  })
);

// Routes
app.use("/auth", authRoutes);
app.use("/wallet", paymentRoutes);
app.use("/keys", keyRoutes);

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
