import mongoose, { Document, Schema } from "mongoose";

export type PermissionType = "deposit" | "transfer" | "read";

export interface IKey extends Document {
  userId: string; // Reference to User
  keyHash: string; // SHA256/bcrypt hash of the actual key
  name: string; // User-friendly name
  permissions: PermissionType[]; // ["deposit", "transfer", "read"]
  expiresAt: Date; // When key expires
  isRevoked: boolean; // Manual revocation
  createdAt: Date;
  updatedAt: Date;
}

const keySchema = new Schema<IKey>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    permissions: {
      type: [String],
      enum: ["deposit", "transfer", "read"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

export const Key = mongoose.model<IKey>("Key", keySchema);
