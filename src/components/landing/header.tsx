"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { ConnectWalletButton } from "@/components/connect-wallet-button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Mail className="h-6 w-6" />
          <span className="text-xl font-bold">MetaMail</span>
        </Link>

        <ConnectWalletButton size="sm" />
      </div>
    </header>
  );
}
