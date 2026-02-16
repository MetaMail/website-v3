"use client";

import { createContext, useContext } from "react";
import { useLogin, type LoginStep } from "@/lib/hooks/use-login";

interface LoginContextValue {
  step: LoginStep;
  error: string | null;
}

const LoginContext = createContext<LoginContextValue>({
  step: "idle",
  error: null,
});

export function LoginProvider({ children }: { children: React.ReactNode }) {
  const loginState = useLogin();

  return (
    <LoginContext.Provider value={loginState}>{children}</LoginContext.Provider>
  );
}

export function useLoginState() {
  return useContext(LoginContext);
}
