"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";
import { ConnectWalletButton } from "@/components/connect-wallet-button";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32 lg:py-40">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-br from-blue-100 via-purple-50 to-transparent blur-3xl opacity-60" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            End-to-end encrypted email on Ethereum
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Your Web3 Email
          </h1>

          <p className="mb-10 text-lg text-muted-foreground sm:text-xl md:text-2xl leading-relaxed">
            Send and receive encrypted emails using your wallet address or ENS
            name. No passwords, no middlemen, true ownership.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <ConnectWalletButton
              label="Get Started"
              size="lg"
              className="text-base px-8"
            />
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base px-8"
              asChild
            >
              <a href="#how-it-works">
                Learn More
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
