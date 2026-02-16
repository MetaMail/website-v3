import { apiClient } from "./client";

export interface RandomStrResponse {
  signMethod: string;
  tokenForRandom: string;
  domain: { name: string; version: string };
  signTypes: Record<string, Array<{ name: string; type: string }>>;
  signMessages: Record<string, string>;
  isNewUser: boolean;
}

export interface AuthTokenResponse {
  newUser: boolean;
  user: {
    last_login: string;
    addr: string;
    chain: string;
    created_at: string;
    account_status: number;
    ens: string;
  };
  expireDate: string;
  token: string;
}

export interface EncryptionKeyResponse {
  salt: string;
  encrypted_private_key: string;
  public_key: string;
  signature: string;
  date?: string;
}

export interface UserProfileResponse {
  total_email_size: number;
  total_email_size_limit: number;
}

export const authApi = {
  getRandomStrToSign(addr: string): Promise<RandomStrResponse> {
    return apiClient.post("/auth/random", { addr });
  },

  getJwtToken(params: {
    tokenForRandom: string;
    signedMessage: string;
  }): Promise<AuthTokenResponse> {
    return apiClient.post("/auth/token", params);
  },

  getEncryptionKey(address: string): Promise<EncryptionKeyResponse | null> {
    return apiClient.get("/users/key", { params: { address } });
  },

  putEncryptionKey(data: {
    data: {
      signature: string;
      salt: string;
      encrypted_private_key: string;
      public_key: string;
      keys_meta: string;
      date: string;
    };
  }): Promise<void> {
    return apiClient.put("/users/key", data);
  },

  logout(): Promise<void> {
    return apiClient.delete("/auth/token");
  },

  getUserProfile(): Promise<UserProfileResponse> {
    return apiClient.get("/users/profile");
  },
};
