import swaggerJsdoc from "swagger-jsdoc";
import config from "./index";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Paystack Wallet Service API",
      version: "1.0.0",
      description:
        "A wallet service with Google authentication, Paystack integration, and API key management for service-to-service access",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: config.appBaseUrl,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token from Google sign-in",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key for service-to-service access",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error code",
            },
            message: {
              type: "string",
              description: "Human-readable error message",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "Unique user identifier",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            name: {
              type: "string",
              description: "User full name",
            },
            wallet: {
              type: "string",
              description: "User's wallet number",
            },
            picture: {
              type: "string",
              description: "User profile picture URL",
            },
            token: {
              type: "string",
              description: "JWT authentication token",
            },
          },
        },
        ApiKey: {
          type: "object",
          properties: {
            api_key: {
              type: "string",
              description: "Generated API key (format: sk_live_xxxxx)",
            },
            expires_at: {
              type: "string",
              format: "date-time",
              description: "API key expiration timestamp",
            },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            reference: {
              type: "string",
              description: "Unique transaction reference",
            },
            amount: {
              type: "number",
              description: "Transaction amount in kobo",
            },
            type: {
              type: "string",
              enum: ["deposit", "transfer"],
              description: "Transaction type",
            },
            status: {
              type: "string",
              enum: ["pending", "success", "failed"],
              description: "Transaction status",
            },
            userId: {
              type: "string",
              description: "User ID (for deposits)",
            },
            senderId: {
              type: "string",
              description: "Sender ID (for transfers)",
            },
            receiverId: {
              type: "string",
              description: "Receiver ID (for transfers)",
            },
            paidAt: {
              type: "string",
              format: "date-time",
              description: "Payment completion timestamp",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Transaction creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Transaction last update timestamp",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "Google OAuth authentication endpoints",
      },
      {
        name: "API Keys",
        description: "API key management for service-to-service access",
      },
      {
        name: "Wallet",
        description:
          "Wallet operations including deposits, transfers, and balance",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
