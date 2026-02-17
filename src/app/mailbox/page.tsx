"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/store/auth";
import { useMailStore } from "@/lib/store/mail";
import { useComposeStore } from "@/lib/store/compose";
import { Sidebar } from "@/components/mailbox/sidebar";
import { MailList } from "@/components/mailbox/mail-list";
import { MailDetail } from "@/components/mailbox/mail-detail";
import { ComposeMail } from "@/components/mailbox/compose-mail";
import { Toaster } from "@/components/ui/sonner";


export default function MailboxPage() {
  const router = useRouter();
  const { loadFromStorage, token } = useAuthStore();
  const { selectedMailId } = useMailStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setHydrated(true);
  }, [loadFromStorage]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/");
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) return null;

  const handleCompose = () => {
    useComposeStore.getState().openCompose();
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-dvh flex">
        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
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

        {/* Content area — list or detail, never both */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className={selectedMailId ? "hidden" : "flex flex-col flex-1 min-h-0"}>
            <MailList onOpenSidebar={() => setSidebarOpen(true)} />
          </div>
          {selectedMailId && <MailDetail onOpenSidebar={() => setSidebarOpen(true)} />}
        </div>
      </div>
      <ComposeMail />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
