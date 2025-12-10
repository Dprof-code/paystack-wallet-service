import crypto from "crypto";
import { Key } from "../models/Key";

const keyService = {
  async createKey(
    userId: string,
    name: string,
    permissions: string[],
    expiry: string
  ) {
    const randomKey = crypto.randomBytes(32).toString("hex");
    const key = `sk_live_${randomKey}`;
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");

    const createdKey = await Key.create({
      userId: userId,
      keyHash: keyHash,
      name: name,
      permissions: permissions,
      expiresAt: calculateExpiry(expiry),
      isRevoked: false,
    });
    return { createdKey, key };
  },

  async countActiveKeys(userId: string) {
    const activeKeys = await Key.countDocuments({
      userId: userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
    return activeKeys;
  },

  async rolloverKey(userId: string, expiredKey: string, expiry: string) {
    const expiredKeyHash = crypto
      .createHash("sha256")
      .update(expiredKey)
      .digest("hex");

    const existingKey = await Key.findOne({
      userId: userId,
      keyHash: expiredKeyHash,
      isRevoked: false,
    });

    if (!existingKey) {
      throw new Error("Expired key not found or already revoked");
    }

    if (existingKey.expiresAt > new Date()) {
      throw new Error("Key has not yet expired");
    }
    existingKey.isRevoked = true;
    await existingKey.save();
    return this.createKey(
      userId,
      existingKey.name,
      existingKey.permissions,
      expiry
    );
  },
};

function calculateExpiry(expiry: string): Date {
  const now = new Date();
  const unit = expiry.slice(-1); // Get last character
  const value = parseInt(expiry.slice(0, -1)); // Get number part

  switch (unit) {
    case "H": // Hour
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case "D": // Day
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case "M": // Month (30 days approximation)
      return new Date(now.getTime() + value * 30 * 24 * 60 * 60 * 1000);
    case "Y": // Year (365 days)
      return new Date(now.getTime() + value * 365 * 24 * 60 * 60 * 1000);
    default:
      throw new Error("Invalid expiry format");
  }
}

export default keyService;
