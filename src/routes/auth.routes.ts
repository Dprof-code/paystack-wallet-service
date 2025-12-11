import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import googleAuthService from "../services/googleAuth.service";
import { User } from "../models/User";
import { Wallet } from "../models/Wallet";
import config from "../config";

const router = Router();

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth sign-in
 *     description: Returns Google authorization URL as JSON
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Google authorization URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 google_auth_url:
 *                   type: string
 *                   example: https://accounts.google.com/o/oauth2/v2/auth?...
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/google", (req: Request, res: Response) => {
  try {
    const googleAuthUrl = googleAuthService.getAuthorizationUrl();

    const acceptHeader = req.headers.accept || "";
    const prefersJson = acceptHeader.includes("application/json");

    if (prefersJson || !acceptHeader.includes("text/html")) {
      return res.status(200).json({
        google_auth_url: googleAuthUrl,
      });
    }

    return res.redirect(302, googleAuthUrl);
  } catch (error) {
    console.error("Error generating Google auth URL:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to generate Google authentication URL",
    });
  }
});

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles Google OAuth callback, creates/updates user, and returns JWT token
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error code if user denied access
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request or user denied access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or expired authorization code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/google/callback", async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;

    // Check if user denied access
    if (error) {
      return res.status(400).json({
        error: "access_denied",
        message: "User denied access to Google account",
      });
    }

    // Validate code parameter
    if (!code || typeof code !== "string") {
      return res.status(400).json({
        error: "bad_request",
        message: "Missing or invalid authorization code",
      });
    }

    // Exchange code for access token
    let accessToken: string;
    try {
      accessToken = await googleAuthService.getAccessToken(code);
    } catch (error) {
      console.error("Failed to exchange code for token:", error);
      return res.status(401).json({
        error: "invalid_grant",
        message: "Invalid or expired authorization code",
      });
    }

    // Fetch user information from Google
    let userInfo;
    try {
      userInfo = await googleAuthService.getUserInfo(accessToken);
      console.log("userinfo: ", userInfo);
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      return res.status(500).json({
        error: "provider_error",
        message: "Failed to retrieve user information from Google",
      });
    }

    // Create or update user in database
    let user;
    let wallet;
    try {
      // Check if user already exists
      user = await User.findOne({ googleId: userInfo.id });

      if (!user) {
        // Create new user
        user = await User.create({
          googleId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        });
      } else {
        // Update existing user info
        user.name = userInfo.name;
        user.picture = userInfo.picture;
        await user.save();
      }

      // Find or create wallet for this user
      wallet = await Wallet.findOne({ userId: user._id });
      if (!wallet) {
        wallet = await Wallet.create({
          walletNumber: googleAuthService.generateWallet(),
          balance: 0,
          userId: user._id,
        });
      }
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json({
        error: "database_error",
        message: "Failed to save user information",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    // Return user information
    return res.status(200).json({
      user_id: user._id.toString(),
      email: user.email,
      name: user.name,
      wallet: wallet.walletNumber,
      picture: user.picture,
      token,
    });
  } catch (error) {
    console.error("Unexpected error in Google callback:", error);
    return res.status(500).json({
      error: "internal_error",
      message: "An unexpected error occurred",
    });
  }
});

export default router;
