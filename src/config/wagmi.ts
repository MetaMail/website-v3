"use client";

import { createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "MetaMail",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "d76ba7c7d72830d1ef0f73610b9e9ed3",
    chains: [mainnet],
    enableFamily: false,
  })
);
