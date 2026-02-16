"use client";

import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useMailStore } from "@/lib/store/mail";
import { MailListItem } from "./mail-list-item";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Inbox,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Star,
  MailCheck,
  MailOpen,
  X,
  Filter,
  Lock,
  Mail,
} from "lucide-react";
import { FilterType } from "@/lib/constants";

const quickFilters = [
  { label: "All Mail", filter: FilterType.Inbox, icon: Mail },
  { label: "Unread", filter: FilterType.Unread, icon: MailOpen },
  { label: "Read", filter: FilterType.Read, icon: MailCheck },
  { label: "Starred", filter: FilterType.Starred, icon: Star },
  { label: "Encrypted", filter: FilterType.Encrypted, icon: Lock },
] as const;

const filterLabels: Record<FilterType, string> = {
  [FilterType.Inbox]: "Inbox",
  [FilterType.Encrypted]: "Encrypted",
  [FilterType.Sent]: "Sent",
  [FilterType.Trash]: "Trash",
  [FilterType.Draft]: "Drafts",
  [FilterType.Starred]: "Starred",
  [FilterType.Spam]: "Spam",
  [FilterType.Read]: "Read",
  [FilterType.Unread]: "Unread",
};

function getPageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);
  return pages;
}

export function MailList() {
  const {
    filter,
    mails,
    loading,
    pageIndex,
    pageCount,
    total,
    setFilter,
    setPage,
    fetchMails,
    fetchStats,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    batchDelete,
    batchMarkRead,
    batchMarkUnread,
    batchStar,
    emptyTrash,
  } = useMailStore();

  const hasSelection = selectedIds.size > 0;
  const allSelected = mails.length > 0 && mails.every((m) => selectedIds.has(m.message_id));

  useEffect(() => {
    fetchMails();
    fetchStats();
  }, [fetchMails, fetchStats]);

  // Auto-refresh mails and stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMails();
      fetchStats();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchMails, fetchStats]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b min-h-[52px]">
        {hasSelection ? (
          <>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => (allSelected ? clearSelection() : selectAll())}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearSelection}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={batchDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {filter === FilterType.Trash ? "Delete Forever" : "Trash"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={batchStar}>
                    <Star className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Star</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={batchMarkRead}>
                    <MailCheck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Mark Read</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={batchMarkUnread}>
                    <MailOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Mark Unread</TooltipContent>
              </Tooltip>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={false}
                onCheckedChange={() => selectAll()}
                className="h-4 w-4"
              />
              <h2 className="text-lg font-semibold">{filterLabels[filter]}</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {quickFilters.map((qf) => (
                    <DropdownMenuItem
                      key={qf.filter}
                      onClick={() => setFilter(qf.filter)}
                      className={filter === qf.filter ? "font-semibold" : ""}
                    >
                      <qf.icon className="h-4 w-4 mr-2" />
                      {qf.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              {filter === FilterType.Trash && mails.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={emptyTrash}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Empty Trash
                </Button>
              )}
              {total > 0 && (
                <span className="text-sm text-muted-foreground">
                  {total} {total === 1 ? "message" : "messages"}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mail list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : mails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No messages</p>
            <p className="text-sm">
              {filter === FilterType.Inbox
                ? "Your inbox is empty"
                : `No messages in ${filterLabels[filter].toLowerCase()}`}
            </p>
          </div>
        ) : (
          mails.map((mail) => (
            <MailListItem
              key={mail.message_id}
              mail={mail}
              isChecked={selectedIds.has(mail.message_id)}
              hasSelection={hasSelection}
              onToggleSelect={() => toggleSelect(mail.message_id)}
            />
          ))
        )}
      </ScrollArea>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <span className="text-sm text-muted-foreground">
            {(pageIndex - 1) * 30 + 1}&ndash;{Math.min(pageIndex * 30, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pageIndex <= 1}
              onClick={() => setPage(pageIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers(pageIndex, pageCount).map((page, i) =>
              page === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                  &hellip;
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === pageIndex ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 text-sm"
                  onClick={() => setPage(page as number)}
                >
                  {page}
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={pageIndex >= pageCount}
              onClick={() => setPage(pageIndex + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
