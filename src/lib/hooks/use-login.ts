"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWalletClient, useDisconnect } from "wagmi";
import { authApi } from "@/lib/api/auth";
import { generateEncryptionKeys } from "@/lib/crypto";
import { useAuthStore } from "@/lib/store/auth";

export type LoginStep = "idle" | "signing" | "generating-keys";

export function useLogin() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<LoginStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const loginInProgress = useRef(false);

  const handleLogin = useCallback(async () => {
    if (!address || !walletClient) return;
    if (loginInProgress.current) return;
    loginInProgress.current = true;

    setError(null);
    const lowerAddress = address.toLowerCase();

    try {
      // Sign the challenge
      setStep("signing");
      const signData = await authApi.getRandomStrToSign(lowerAddress);

      // Small delay for WalletConnect relay to stabilize on mobile
      await new Promise((r) => setTimeout(r, 500));

      const primaryType = Object.keys(signData.signTypes)[0];
      const signedMessage = await walletClient.signTypedData({
        account: address,
        domain: signData.domain,
        types: signData.signTypes,
        primaryType,
        message: signData.signMessages,
      });

      // Get JWT
      const authResponse = await authApi.getJwtToken({
        tokenForRandom: signData.tokenForRandom,
        signedMessage,
      });

      // Store token immediately so subsequent API calls are authenticated
      localStorage.setItem("mm_token", authResponse.token);

      // Check / generate encryption keys
      let encryptionData = await authApi.getEncryptionKey(lowerAddress);

      if (!encryptionData?.signature) {
        setStep("generating-keys");
        const newKeys = await generateEncryptionKeys(walletClient);
        await authApi.putEncryptionKey({ data: newKeys });
        encryptionData = {
          salt: newKeys.salt,
          encrypted_private_key: newKeys.encrypted_private_key,
          public_key: newKeys.public_key,
          signature: newKeys.signature,
        };
      }

      // Store auth
      setAuth(authResponse.token, {
        address: lowerAddress,
        ensName: authResponse.user.ens || "",
        publicKey: encryptionData.public_key,
        encryptedPrivateKey: encryptionData.encrypted_private_key,
        salt: encryptionData.salt,
      });

      // Navigate to mailbox — keep wallet connected for compose/drafts
      router.push("/mailbox");
    } catch (err: unknown) {
      const error = err as { code?: string | number; message?: string };

      // User rejected the request
      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        setError("Signature rejected. Please try again.");
        setStep("idle");
        disconnect();
        return;
      }

      console.error("Login failed:", err);

      // Map common errors to user-friendly messages
      let message = "Login failed. Please try again.";
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("timeout") || msg.includes("timed out")) {
        message = "Request timed out. Please open MetaMask and try again.";
      } else if (msg.includes("disconnected") || msg.includes("session")) {
        message = "Wallet disconnected. Please reconnect and try again.";
      } else if (msg.includes("network") || msg.includes("chain")) {
        message = "Please switch to Ethereum mainnet and try again.";
      }

      setError(message);
      setStep("idle");
      disconnect();
    } finally {
      loginInProgress.current = false;
    }
  }, [address, walletClient, setAuth, router, disconnect]);

  // Trigger login when wallet connects
  useEffect(() => {
    if (isConnected && walletClient && step === "idle") {
      handleLogin();
    }
  }, [isConnected, walletClient, step, handleLogin]);

  return { step, error };
}
