import mongoose, { Document, Schema } from "mongoose";

export interface IWallet extends Document {
  walletNumber: string;
  balance: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    walletNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    userId: {
      type: String,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet = mongoose.model<IWallet>("Wallet", walletSchema);
