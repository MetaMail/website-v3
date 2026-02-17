"use client";

import { createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "MetaMail",
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
    chains: [mainnet],
    enableFamily: false,
  })
);
