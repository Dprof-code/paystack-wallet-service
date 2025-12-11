import { Router, Response } from "express";
import keyService from "../services/key.service";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /keys/create:
 *   post:
 *     summary: Create a new API key
 *     description: Generate a new API key with specified permissions and expiry (max 5 active keys per user)
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - permissions
 *               - expiry
 *             properties:
 *               name:
 *                 type: string
 *                 description: Friendly name for the API key
 *                 example: payment-processor
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [deposit, transfer, read]
 *                 description: Array of permissions to grant
 *                 example: ["deposit", "read"]
 *               expiry:
 *                 type: string
 *                 enum: [1H, 1D, 1M, 1Y]
 *                 description: Key expiration time (H=Hour, D=Day, M=Month, Y=Year)
 *                 example: 1M
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKey'
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Limit exceeded - maximum 5 active keys allowed
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
router.post(
  "/create",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, permissions, expiry } = req.body;
      const userId = req.user?.id;

      if (!name || !permissions || !expiry) {
        return res.status(400).json({
          error: "bad_request",
          message: "Missing required fields: name, permissions, expiry",
        });
      }

      const activeKeys = await keyService.countActiveKeys(userId!);
      const maxKeysAllowed = 5;
      if (activeKeys >= maxKeysAllowed) {
        return res.status(403).json({
          error: "limit_exceeded",
          message: `You can only have up to ${maxKeysAllowed} active API keys.`,
        });
      }

      const apiKey = await keyService.createKey(
        userId!,
        name,
        permissions,
        expiry
      );
      return res.status(201).json({
        api_key: apiKey.key,
        expires_at: apiKey.createdKey.expiresAt,
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      return res.status(500).json({
        error: "internal_server_error",
        message: "Failed to create API key",
      });
    }
  }
);

/**
 * @swagger
 * /keys/rollover:
 *   post:
 *     summary: Rollover an expired API key
 *     description: Generate a new API key using the same permissions as an expired key
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expired_key_id
 *               - expiry
 *             properties:
 *               expired_key_id:
 *                 type: string
 *                 description: The expired API key to rollover
 *                 example: sk_live_abc123def456...
 *               expiry:
 *                 type: string
 *                 enum: [1H, 1D, 1M, 1Y]
 *                 description: Expiration time for the new key
 *                 example: 1M
 *     responses:
 *       200:
 *         description: API key rolled over successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKey'
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid or missing JWT token
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
router.post(
  "/rollover",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { expired_key_id, expiry } = req.body;
      const userId = req.user?.id;

      if (!expired_key_id || !expiry) {
        return res.status(400).json({
          error: "bad_request",
          message: "Missing required fields: expired_key, expiry",
        });
      }

      const newApiKey = await keyService.rolloverKey(
        userId!,
        expired_key_id,
        expiry
      );
      return res.status(200).json({
        api_key: newApiKey.key,
        expires_at: newApiKey.createdKey.expiresAt,
      });
    } catch (error) {
      console.error("Error rolling over API key:", error);
      return res.status(500).json({
        error: "internal_server_error",
        message: "Failed to rollover API key",
      });
    }
  }
);

/**
 * @swagger
 * /keys/revoke:
 *   post:
 *     summary: Revoke an active API key
 *     description: Manually revoke an API key to immediately invalidate it
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: The API key to revoke
 *                 example: sk_live_abc123def456...
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: API key revoked successfully
 *                 revoked_key_name:
 *                   type: string
 *                   example: payment-processor
 *       400:
 *         description: Bad request - missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: API key not found or already revoked
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
router.post(
  "/revoke",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { api_key } = req.body;
      const userId = req.user?.id;

      if (!api_key) {
        return res.status(400).json({
          error: "bad_request",
          message: "Missing required field: api_key",
        });
      }

      const revokedKey = await keyService.revokeKey(userId!, api_key);
      return res.status(200).json({
        message: "API key revoked successfully",
        revoked_key_name: revokedKey.name,
      });
    } catch (error: any) {
      console.error("Error revoking API key:", error);

      if (error.message === "API key not found or already revoked") {
        return res.status(404).json({
          error: "not_found",
          message: error.message,
        });
      }

      return res.status(500).json({
        error: "internal_server_error",
        message: "Failed to revoke API key",
      });
    }
  }
);

export default router;
