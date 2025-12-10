import { Router, Request, Response } from "express";
import paystackService from "../services/wallet.service";
import { Transaction } from "../models/Transaction";
import { Wallet } from "../models/Wallet";
import { authenticate, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

/**
 * POST /wallet/deposit
 * Initiate a deposit with Paystack
 */
router.post(
  "/deposit",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { amount } = req.body;

      const userId = req.user!.id;
      const userEmail = req.user!.email;

      // Validate amount
      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({
          error: "invalid_input",
          message: "Amount must be a positive number (in kobo)",
        });
      }

      // Generate unique reference
      const reference = paystackService.generateReference();

      // Check if transaction with this reference already exists (idempotency)
      const existingTransaction = await Transaction.findOne({ reference });
      if (existingTransaction) {
        return res.status(200).json({
          reference: existingTransaction.reference,
          authorization_url: existingTransaction.paystackAuthorizationUrl,
          message: "Transaction already exists",
        });
      }

      // Initialize transaction with Paystack
      let paystackResponse;
      try {
        paystackResponse = await paystackService.initializeTransaction(
          amount,
          userEmail,
          reference
        );
      } catch (error) {
        console.error("Paystack initialization error:", error);
        return res.status(402).json({
          error: "payment_initiation_failed",
          message:
            error instanceof Error
              ? error.message
              : "Failed to initiate payment with Paystack",
        });
      }

      // Save transaction to database
      try {
        const transaction = new Transaction({
          reference: paystackResponse.reference,
          amount,
          type: "deposit",
          status: "pending",
          paystackAuthorizationUrl: paystackResponse.authorization_url,
          userId: userId,
        });

        await transaction.save();

        return res.status(201).json({
          reference: transaction.reference,
          authorization_url: transaction.paystackAuthorizationUrl,
        });
      } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({
          error: "database_error",
          message: "Failed to save transaction",
        });
      }
    } catch (error) {
      console.error("Unexpected error in payment initiation:", error);
      return res.status(500).json({
        error: "internal_error",
        message: "An unexpected error occurred",
      });
    }
  }
);

/**
 * POST /wallet/paystack/webhook
 * Handle Paystack webhook events
 */
router.post("/paystack/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string;
    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;

    if (
      !webhookSecret ||
      webhookSecret === "your_paystack_webhook_secret_here"
    ) {
      console.log("⚠️  DEV MODE: Skipping webhook signature verification");
    } else {
      // Verify signature in production
      if (!signature) {
        return res.status(400).json({
          error: "invalid_request",
          message: "Missing Paystack signature",
        });
      }

      const payload = JSON.stringify(req.body);
      const isValid = paystackService.verifyWebhookSignature(
        payload,
        signature
      );

      if (!isValid) {
        console.warn("Invalid webhook signature");
        return res.status(400).json({
          error: "invalid_signature",
          message: "Invalid webhook signature",
        });
      }
    }

    // Process webhook event
    const event = req.body;

    if (event.event === "charge.success") {
      const { reference, status, amount, paid_at } = event.data;

      const transaction = await Transaction.findOne({ reference });

      if (transaction) {
        const userId = transaction.userId;
        const wallet = await Wallet.findOne({ userId });

        if (wallet) {
          wallet.balance = wallet.balance + amount;
          await wallet.save();
        }
        transaction.status = status === "success" ? "success" : "failed";
        transaction.amount = amount;
        if (paid_at) {
          transaction.paidAt = new Date(paid_at);
        }
        await transaction.save();

        console.log(`Transaction ${reference} updated to ${status}`);
      } else {
        console.warn(`Transaction with reference ${reference} not found`);
      }
    }

    return res.status(200).json({
      status: true,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({
      error: "internal_error",
      message: "Failed to process webhook",
    });
  }
});

/**
 * GET /wallet/deposit/:reference/status
 * Check transaction status
 */
router.get(
  "/deposit/:reference/status",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { reference } = req.params;
      const { refresh } = req.query;

      if (!reference) {
        return res.status(400).json({
          error: "invalid_request",
          message: "Transaction reference is required",
        });
      }

      const userId = req.user!.id;

      // Find transaction in database
      let transaction = await Transaction.findOne({ reference });

      if (!transaction) {
        return res.status(404).json({
          error: "not_found",
          message: "Transaction not found",
        });
      }

      // Authorization: Ensure user owns this transaction
      if (transaction.userId !== userId) {
        return res.status(403).json({
          error: "forbidden",
          message: "You don't have permission to view this transaction",
        });
      }

      // If refresh is requested or status is pending, verify with Paystack
      if (refresh === "true" || transaction.status === "pending") {
        try {
          const paystackData = await paystackService.verifyTransaction(
            reference
          );

          // Update transaction with latest data from Paystack
          transaction.status = paystackData.status;
          transaction.amount = paystackData.amount;
          if (paystackData.paid_at) {
            transaction.paidAt = new Date(paystackData.paid_at);
          }
          await transaction.save();
        } catch (error) {
          console.error("Failed to verify with Paystack:", error);
          // Continue with database status if verification fails
        }
      }

      return res.status(200).json({
        reference: transaction.reference,
        status: transaction.status,
        amount: transaction.amount,
      });
    } catch (error) {
      console.error("Error checking transaction status:", error);
      return res.status(500).json({
        error: "internal_error",
        message: "Failed to retrieve transaction status",
      });
    }
  }
);

/**
 * GET /wallet/balance
 * Get user wallet balance
 */
router.get(
  "/balance",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const hasWallet = await Wallet.findOne({ userId: userId });
      if (hasWallet) {
        return res.status(200).json({
          balance: hasWallet.balance,
        });
      }
    } catch (error) {
      console.error("Unexpected error in getting user balance:", error);
      return res.status(500).json({
        error: "internal_error",
        message: "An unexpected error occurred",
      });
    }
  }
);

/**
 * POST /wallet/transfer
 * Wallet transfer
 */
router.post(
  "/transfer",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { amount, wallet_number } = req.body;

      const userId = req.user!.id;

      const hasWallet = await Wallet.findOne({ userId: userId });

      if (hasWallet) {
        if (hasWallet.userId == userId) {
          return res.status(200).json({
            status: "failed",
            message: "You cannot transfer to yourself",
          });
        }

        if (hasWallet.balance >= amount) {
          const recipientWallet = await Wallet.findOne({
            walletNumber: wallet_number,
          });

          if (recipientWallet) {
            recipientWallet.balance = recipientWallet.balance + amount;
            await recipientWallet.save();

            hasWallet.balance = hasWallet.balance - amount;
            await hasWallet.save();

            const transaction = new Transaction({
              reference: paystackService.generateReference(),
              amount,
              type: "transfer",
              status: "success",
              paystackAuthorizationUrl: null,
              senderId: userId,
              receiverId: recipientWallet.userId,
            });

            await transaction.save();

            return res.status(200).json({
              status: "success",
              message: "Transfer completed",
            });
          } else {
            return res.status(200).json({
              status: "failed",
              message: "Wallet Number not found",
            });
          }
        } else {
          return res.status(200).json({
            status: "failed",
            message: "Insufficient Balance",
          });
        }
      }
    } catch (error) {
      console.error("Unexpected error in making transfer:", error);
      return res.status(500).json({
        error: "internal_error",
        message: "An unexpected error occurred",
      });
    }
  }
);

/**
 * GET /wallet/transactions
 */
router.get(
  "/transactions",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      // Find all transactions where user is involved (deposits, sent, or received)
      const transactions = await Transaction.find({
        $or: [{ userId: userId }, { senderId: userId }, { receiverId: userId }],
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        transactions: transactions.map((tx) => ({
          type: tx.type,
          amount: tx.amount,
          status: tx.status,
        })),
      });
    } catch (error) {
      console.error("Unexpected error in getting transaction history:", error);
      return res.status(500).json({
        error: "internal_error",
        message: "An unexpected error occurred",
      });
    }
  }
);

export default router;
