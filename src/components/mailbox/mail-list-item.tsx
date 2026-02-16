"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MailItem, MarkType, MetaMailType, ReadStatus, FilterType } from "@/lib/constants";
import { useMailStore } from "@/lib/store/mail";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, ShieldCheck, Trash2, AlertCircle } from "lucide-react";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getSenderDisplay(mail: MailItem): string {
  if (mail.mail_from.name) return mail.mail_from.name;
  const addr = mail.mail_from.address;
  if (addr.includes("@")) {
    const local = addr.split("@")[0];
    if (local.startsWith("0x") && local.length > 12) {
      return `${local.slice(0, 6)}...${local.slice(-4)}`;
    }
    return local;
  }
  return addr;
}

interface MailListItemProps {
  mail: MailItem;
  isChecked: boolean;
  hasSelection: boolean;
  onToggleSelect: () => void;
}

export function MailListItem({ mail, isChecked, hasSelection, onToggleSelect }: MailListItemProps) {
  const { selectedMailId, selectMail, toggleStar, deleteMail, filter } = useMailStore();
  const isSelected = selectedMailId === mail.message_id;
  const isUnread = mail.read === ReadStatus.Unread;
  const isStarred = mail.mark === MarkType.Starred;
  const isEncrypted = mail.meta_type === MetaMailType.Encrypted;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 cursor-pointer border-b transition-colors hover:bg-accent",
        isSelected && "bg-muted",
        isUnread && "border-l-2 border-l-blue-500 pl-[14px]"
      )}
      onClick={() => selectMail(mail.message_id, mail.mailbox)}
    >
      {/* Checkbox — visible on hover or when any selection is active */}
      <div
        className={cn(
          "shrink-0 w-4 flex items-center justify-center transition-opacity",
          hasSelection || isChecked
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggleSelect()}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4"
          aria-label={`Select mail from ${getSenderDisplay(mail)}`}
        />
      </div>

      {/* Star */}
      <button
        className="shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={isStarred ? "Unstar" : "Star"}
        onClick={(e) => {
          e.stopPropagation();
          toggleStar(mail);
        }}
      >
        <Star
          className={cn(
            "h-4 w-4 transition-colors",
            isStarred
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/40 hover:text-yellow-400"
          )}
        />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={cn(
              "text-sm truncate",
              isUnread ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
            )}
          >
            {getSenderDisplay(mail)}
          </span>
          {isEncrypted && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-px text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
              <ShieldCheck className="h-3 w-3" />
              E2E
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm truncate",
              isUnread ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {mail.subject || "(No Subject)"}
          </span>
        </div>
      </div>

      {/* Date & actions — overlay in same space with opacity transitions */}
      <div className="relative flex items-center shrink-0">
        <span className={cn(
          "text-xs opacity-100 group-hover:opacity-0 transition-opacity duration-150",
          isUnread ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {formatDate(mail.mail_date)}
        </span>
        <div className="absolute right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${filter === FilterType.Trash ? "text-destructive hover:text-destructive" : ""}`}
                aria-label={filter === FilterType.Trash ? "Delete Forever" : "Trash"}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMail(mail);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {filter === FilterType.Trash ? "Delete Forever" : "Trash"}
            </TooltipContent>
          </Tooltip>
          {filter !== FilterType.Trash && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Spam"
                  onClick={(e) => {
                    e.stopPropagation();
                    useMailStore.getState().moveTo(mail, MarkType.Spam);
                  }}
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Spam</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
