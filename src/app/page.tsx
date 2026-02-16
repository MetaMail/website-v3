"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Footer } from "@/components/landing/footer";
import { LoginProvider } from "@/components/login-provider";
import { useAuthStore } from "@/lib/store/auth";

export default function Home() {
  const router = useRouter();
  const { loadFromStorage, token } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setHydrated(true);
  }, [loadFromStorage]);

  useEffect(() => {
    if (hydrated && token) {
      router.replace("/mailbox");
    }
  }, [hydrated, token, router]);

  if (!hydrated) return null;

  return (
    <LoginProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Hero />
          <Features />
          <HowItWorks />
        </main>
        <Footer />
      </div>
    </LoginProvider>
  );
}
