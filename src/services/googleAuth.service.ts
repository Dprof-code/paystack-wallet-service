import axios from "axios";
import config from "../config";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string; // Google User ID
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

class GoogleAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tokenUrl = "https://oauth2.googleapis.com/token";
  private readonly userInfoUrl =
    "https://www.googleapis.com/oauth2/v2/userinfo";
  private readonly authUrl = "https://accounts.google.com/o/oauth2/v2/auth";

  constructor() {
    this.clientId = config.google.clientId;
    this.clientSecret = config.google.clientSecret;
    this.redirectUri = config.google.redirectUri;
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<string> {
    try {
      const response = await axios.post<GoogleTokenResponse>(
        this.tokenUrl,
        {
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: "authorization_code",
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get access token: ${
            error.response?.data?.error_description || error.message
          }`
        );
      }
      throw error;
    }
  }

  /**
   * Fetch user information from Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get user info: ${
            error.response?.data?.error || error.message
          }`
        );
      }
      throw error;
    }
  }

  /**
   * Generate a wallet number
   */
  generateWallet(): string {
    // Generate a 13-digit numeric wallet number
    const min = 1000000000000; // 13 digits minimum
    const max = 9999999999999; // 13 digits maximum
    const wallet = Math.floor(Math.random() * (max - min + 1) + min);
    return wallet.toString();
  }
}

export default new GoogleAuthService();
