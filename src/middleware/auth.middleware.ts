import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../config";
import { Key } from "../models/Key";
import { User } from "../models/User";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  authType?: "jwt" | "api_key";
  apiKey?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get JWT token from header
    const token = req.headers.authorization?.replace("Bearer ", "");

    // Check for API key
    const apiKey = req.headers["x-api-key"] as string;

    if (token) {
      // Validate JWT
      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: string;
        email: string;
      };
      req.user = { id: decoded.id, email: decoded.email };
      req.authType = "jwt";
      return next();
    }

    if (apiKey) {
      // Hash the provided key
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

      // Find in database
      const key = await Key.findOne({ keyHash });

      // Validate
      if (!key || key.isRevoked || key.expiresAt < new Date()) {
        return res.status(401).json({ error: "Invalid or expired API key" });
      }

      // Get user email with ID
      const user = await User.findOne({ _id: key.userId });

      // Attach user and key info
      req.user = { id: key.userId, email: user ? user.email : "" };
      req.authType = "api_key";
      req.apiKey = key;
      return next();
    }

    return res.status(401).json({
      error: "unauthorized",
      message: "Authentication token or API key required",
    });
  } catch (error) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid or expired token",
    });
  }
};

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // If JWT, allow all (user has full access)
    if (req.authType === "jwt") {
      return next();
    }

    // If API key, check permission
    if (req.apiKey && req.apiKey.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      error: "insufficient_permissions",
      message: `This action requires '${permission}' permission`,
    });
  };
};
