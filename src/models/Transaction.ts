import mongoose, { Document, Schema } from "mongoose";

export type TransactionStatus = "pending" | "success" | "failed";
export type TransactionType = "deposit" | "transfer";

export interface ITransaction extends Document {
  reference: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  paystackAuthorizationUrl?: string;
  userId?: string;
  senderId?: string;
  receiverId?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["deposit", "transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      required: true,
    },
    paystackAuthorizationUrl: {
      type: String,
    },
    userId: {
      type: String,
    },
    senderId: {
      type: String,
    },
    receiverId: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema
);
