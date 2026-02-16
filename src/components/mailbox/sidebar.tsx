"use client";

import { useEffect, useState } from "react";
import { cn, formatSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMailStore } from "@/lib/store/mail";
import { useAuthStore } from "@/lib/store/auth";
import { FilterType, EMAIL_DOMAIN } from "@/lib/constants";
import {
  Inbox,
  Send,
  FileEdit,
  Star,
  Trash2,
  AlertCircle,
  LogOut,
  Copy,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import { MetaMailLogo } from "@/components/metamail-logo";
import { useRouter } from "next/navigation";
import { useDisconnect } from "wagmi";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  icon: LucideIcon;
  filter: FilterType;
  countKey: "unreadCount" | "spamCount" | "draftCount" | null;
}

const navItems: NavItem[] = [
  { label: "Inbox", icon: Inbox, filter: FilterType.Inbox, countKey: "unreadCount" },
  { label: "Sent", icon: Send, filter: FilterType.Sent, countKey: null },
  { label: "Drafts", icon: FileEdit, filter: FilterType.Draft, countKey: "draftCount" },
  { label: "Starred", icon: Star, filter: FilterType.Starred, countKey: null },
];

const moreItems: NavItem[] = [
  { label: "Spam", icon: AlertCircle, filter: FilterType.Spam, countKey: "spamCount" },
  { label: "Trash", icon: Trash2, filter: FilterType.Trash, countKey: null },
];

interface SidebarProps {
  onCompose: () => void;
  className?: string;
}


export function Sidebar({ onCompose, className }: SidebarProps) {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const { filter, setFilter, unreadCount, spamCount, draftCount } = useMailStore();
  const { user, clearAuth, emailSize, emailSizeLimit, fetchProfile } = useAuthStore();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  const [copied, setCopied] = useState(false);
  const counts = { unreadCount, spamCount, draftCount };

  const displayAddress = user
    ? user.ensName || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`
    : "";
  const fullEmail = displayAddress ? `${displayAddress}@${EMAIL_DOMAIN}` : "";

  const handleCopyEmail = async () => {
    if (!fullEmail) return;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLogout = () => {
    disconnect();
    clearAuth();
    router.push("/");
  };

  const renderNavItem = (item: NavItem) => {
    const count = item.countKey ? counts[item.countKey] : 0;
    const isActive = filter === item.filter;

    return (
      <Button
        key={item.label}
        variant={isActive ? "secondary" : "ghost"}
        className={cn("w-full justify-start gap-3", isActive && "font-semibold")}
        onClick={() => setFilter(item.filter)}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
        {count > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs px-2 py-0">
            {count}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* User info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <MetaMailLogo size={24} />
          <span className="font-bold text-lg">MetaMail</span>
        </div>
        <button
          onClick={handleCopyEmail}
          className="group flex items-center gap-1.5 text-sm text-muted-foreground truncate mb-4 hover:text-foreground transition-colors cursor-pointer"
          title="Copy email address"
        >
          <span className="truncate">{fullEmail}</span>
          {copied ? (
            <Check className="h-3 w-3 shrink-0 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
        <Button onClick={onCompose} className="w-full gap-2">
          <FileEdit className="h-4 w-4" />
          Compose
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-1">
          {navItems.map(renderNavItem)}
        </div>
        <Separator className="my-3" />
        <div className="space-y-1">
          {moreItems.map(renderNavItem)}
        </div>
      </ScrollArea>

      {/* Space used */}
      {emailSizeLimit > 0 && (
        <>
          <Separator />
          <div className="px-4 py-3">
            <p className="text-xs font-medium mb-2">Space Used</p>
            <Progress
              value={Math.min(100, (emailSize / emailSizeLimit) * 100)}
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {formatSize(emailSize)} of {formatSize(emailSizeLimit)}
            </p>
          </div>
        </>
      )}

      <Separator />

      {/* Footer actions */}
      <div className="p-2 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
