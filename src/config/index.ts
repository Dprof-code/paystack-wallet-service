import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  jwtSecret: string;
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  paystack: {
    secretKey: string;
    webhookSecret: string;
  };
  appBaseUrl: string;
  frontendSuccessUrl: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/auth/google/callback",
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || "",
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || "",
  },
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  frontendSuccessUrl:
    process.env.FRONTEND_SUCCESS_URL || "http://localhost:3000/payment-success",
};

const validateConfig = () => {
  const required = [
    { key: "GOOGLE_CLIENT_ID", value: config.google.clientId },
    { key: "GOOGLE_CLIENT_SECRET", value: config.google.clientSecret },
    { key: "PAYSTACK_SECRET_KEY", value: config.paystack.secretKey },
    { key: "MONGODB_URI", value: config.mongodbUri },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0 && config.nodeEnv === "production") {
    console.warn(
      `Warning: Missing required environment variables: ${missing
        .map((m) => m.key)
        .join(", ")}`
    );
  }
};

validateConfig();

export default config;
