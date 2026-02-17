"use client";

import { useModal } from "connectkit";
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
  const { setOpen } = useModal();

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
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Wallet className="h-4 w-4" />
        {label}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
