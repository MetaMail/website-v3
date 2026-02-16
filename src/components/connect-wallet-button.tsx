"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLoginState } from "@/components/login-provider";

interface ConnectWalletButtonProps {
  label?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
  className?: string;
}

export function ConnectWalletButton({
  label = "Connect Wallet",
  size = "default",
  variant = "default",
  className,
}: ConnectWalletButtonProps) {
  const { step, error } = useLoginState();

  if (step === "signing") {
    return (
      <Button size={size} variant={variant} className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Signing...
      </Button>
    );
  }

  if (step === "generating-keys") {
    return (
      <Button size={size} variant={variant} className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Setting up keys...
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <Button
            size={size}
            variant={variant}
            className={className}
            onClick={openConnectModal}
          >
            <Wallet className="h-4 w-4" />
            {label}
          </Button>
        )}
      </ConnectButton.Custom>
      {error && (
        <p className="text-sm text-destructive text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
