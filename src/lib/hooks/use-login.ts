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
      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        setStep("idle");
        disconnect();
        return;
      }
      console.error("Login failed:", err);
      setError(
        error.message ||
          "Login failed. Please make sure your wallet has ETH mainnet activity."
      );
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
