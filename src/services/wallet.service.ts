import axios from "axios";
import config from "../config";
import crypto from "crypto";

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: "success" | "failed" | "pending";
    paid_at: string | null;
    transaction_date: string;
    gateway_response: string;
  };
}

class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";
  private readonly webhookSecret: string;

  constructor() {
    this.secretKey = config.paystack.secretKey;
    this.webhookSecret = config.paystack.webhookSecret;
  }

  /**
   * Initialize a payment transaction
   */
  async initializeTransaction(
    amount: number,
    email: string,
    reference?: string
  ): Promise<PaystackInitializeResponse["data"]> {
    try {
      const response = await axios.post<PaystackInitializeResponse>(
        `${this.baseUrl}/transaction/initialize`,
        {
          amount: Math.round(amount), // Amount in kobo (smallest currency unit)
          email,
          reference,
          currency: "NGN",
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.status) {
        throw new Error(
          response.data.message || "Failed to initialize transaction"
        );
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Paystack initialization failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(
    reference: string
  ): Promise<PaystackVerifyResponse["data"]> {
    try {
      const response = await axios.get<PaystackVerifyResponse>(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      if (!response.data.status) {
        throw new Error(
          response.data.message || "Failed to verify transaction"
        );
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Paystack verification failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn("Webhook secret not configured");
      return false;
    }

    const hash = crypto
      .createHmac("sha512", this.webhookSecret)
      .update(payload)
      .digest("hex");

    return hash === signature;
  }

  /**
   * Generate a unique transaction reference
   */
  generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `PS_${timestamp}_${random}`.toUpperCase();
  }
}

export default new PaystackService();
