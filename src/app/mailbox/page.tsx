"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/store/auth";
import { useMailStore } from "@/lib/store/mail";
import { useComposeStore } from "@/lib/store/compose";
import { Sidebar } from "@/components/mailbox/sidebar";
import { MailList } from "@/components/mailbox/mail-list";
import { MailDetail } from "@/components/mailbox/mail-detail";
import { ComposeMail } from "@/components/mailbox/compose-mail";
import { Menu } from "lucide-react";

export default function MailboxPage() {
  const router = useRouter();
  const { loadFromStorage, token } = useAuthStore();
  const { selectedMailId } = useMailStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!token) {
      router.replace("/");
    }
  }, [token, router]);

  if (!token) return null;

  const handleCompose = () => {
    useComposeStore.getState().openCompose();
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex">
        {/* Mobile sidebar toggle */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-3 left-3 z-50 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar
              onCompose={() => {
                setSidebarOpen(false);
                handleCompose();
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 border-r shrink-0">
          <Sidebar onCompose={handleCompose} />
        </aside>

        {/* Mail list */}
        <div className="flex-1 min-w-0 flex">
          <div
            className={`${
              selectedMailId ? "hidden md:flex" : "flex"
            } flex-col w-full md:w-[360px] lg:w-[420px] md:border-r md:shrink-0`}
          >
            <MailList />
          </div>

          {/* Mail detail */}
          {selectedMailId ? (
            <div className="flex-1 min-w-0 flex flex-col">
              <MailDetail />
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
              <p>Select a message to read</p>
            </div>
          )}
        </div>
      </div>
      <ComposeMail />
    </TooltipProvider>
  );
}
