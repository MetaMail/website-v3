"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Inbox,
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
  Send,
  FileText,
  AlertCircle,
  RefreshCw,
  Search,
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

const emptyStateConfig: Record<string, { icon: React.ElementType; message: string }> = {
  [FilterType.Inbox]: { icon: Inbox, message: "Your inbox is empty — new messages will appear here" },
  [FilterType.Sent]: { icon: Send, message: "Messages you send will appear here" },
  [FilterType.Draft]: { icon: FileText, message: "Click Compose to start a new draft" },
  [FilterType.Starred]: { icon: Star, message: "Star important messages to find them here" },
  [FilterType.Trash]: { icon: Trash2, message: "Deleted messages will appear here" },
  [FilterType.Spam]: { icon: AlertCircle, message: "Spam messages will appear here" },
};

function EmptyState({ filter }: { filter: FilterType }) {
  const config = emptyStateConfig[filter] || { icon: Inbox, message: `No messages in ${filterLabels[filter].toLowerCase()}` };
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Icon className="h-12 w-12 mb-4 opacity-40" />
      <p className="text-lg font-medium">No messages</p>
      <p className="text-sm">{config.message}</p>
    </div>
  );
}

export function MailList() {
  const {
    filter,
    mails,
    loading,
    pageIndex,
    pageCount,
    total,
    searchQuery,
    setFilter,
    setPage,
    setSearchQuery,
    clearSearch,
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

  const [refreshing, setRefreshing] = useState(false);
  const [localQuery, setLocalQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync localQuery when store searchQuery is cleared externally (e.g. folder switch)
  useEffect(() => {
    if (searchQuery === "" && localQuery !== "") {
      setLocalQuery("");
    }
    if (searchQuery === "") {
      setSearchOpen(false);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(query);
      }, 400);
    },
    [setSearchQuery]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    if (value.trim()) {
      debouncedSearch(value.trim());
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (searchQuery) clearSearch();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = localQuery.trim();
      if (trimmed) {
        setSearchQuery(trimmed);
      } else if (searchQuery) {
        clearSearch();
      }
    } else if (e.key === "Escape") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setLocalQuery("");
      if (searchQuery) clearSearch();
      setSearchOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalQuery("");
    clearSearch();
    setSearchOpen(false);
  };

  // Uncomment when search API is ready
  // const handleOpenSearch = () => {
  //   setSearchOpen(true);
  //   requestAnimationFrame(() => inputRef.current?.focus());
  // };

  const isSearchMode = searchQuery !== "";

  const hasSelection = selectedIds.size > 0;
  const allSelected = mails.length > 0 && mails.every((m) => selectedIds.has(m.message_id));

  const handleRefresh = async () => {
    setRefreshing(true);
    // Ensure spin lasts at least 600ms so it doesn't stop abruptly
    await Promise.all([
      fetchMails(),
      fetchStats(),
      new Promise((r) => setTimeout(r, 1000)),
    ]);
    setRefreshing(false);
  };

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
      <div className="relative px-4 py-3 border-b min-h-[52px]">
        {/* Batch toolbar — fades in when items are selected */}
        <div
          className={`flex items-center justify-between transition-opacity duration-150 ${
            hasSelection ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => (allSelected ? clearSelection() : selectAll())}
              className="h-4 w-4"
              aria-label={allSelected ? "Deselect all" : "Select all"}
            />
            <span className="text-sm font-medium" aria-live="polite" aria-atomic="true">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Clear selection"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={filter === FilterType.Trash ? "Delete forever" : "Move to trash"} onClick={batchDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {filter === FilterType.Trash ? "Delete Forever" : "Trash"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Star selected" onClick={batchStar}>
                  <Star className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Star</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mark as read" onClick={batchMarkRead}>
                  <MailCheck className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Mark Read</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mark as unread" onClick={batchMarkUnread}>
                  <MailOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Mark Unread</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {/* Normal header — fades in when no selection */}
        <div
          className={`absolute inset-0 flex items-center justify-between px-4 py-3 transition-opacity duration-150 ${
            hasSelection ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Left side: either search input or title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {searchOpen || isSearchMode ? (
              <div className="relative flex-1 max-w-md animate-in fade-in slide-in-from-left-2 duration-200">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={localQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search emails..."
                  className="pl-9 pr-9 h-8"
                />
                {(localQuery || isSearchMode) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Checkbox
                  checked={false}
                  onCheckedChange={() => selectAll()}
                  className="h-4 w-4"
                  aria-label="Select all messages"
                />
                <h2 className="text-lg font-semibold">{filterLabels[filter]}</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Filter messages">
                      <Filter className="h-4 w-4" />
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
                {/* Search button — hidden until search API is ready
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Search"
                      onClick={handleOpenSearch}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Search</TooltipContent>
                </Tooltip>
                */}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filter === FilterType.Trash && mails.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={emptyTrash}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Empty Trash
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Refresh"
                  disabled={refreshing}
                  onClick={handleRefresh}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin-ease-out" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Mail list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-5 flex items-center mb-0.5">
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                  <div className="h-5 flex items-center">
                    <Skeleton className="h-3.5 w-48" />
                  </div>
                </div>
                <Skeleton className="h-3 w-14 shrink-0" />
              </div>
            ))}
          </div>
        ) : mails.length === 0 ? (
          isSearchMode ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <EmptyState filter={filter} />
          )
        ) : (
          <div
            className="animate-in fade-in duration-200"
            style={{ "--tw-enter-opacity": 0.3 } as React.CSSProperties}
          >
            {mails.map((mail) => (
              <MailListItem
                key={mail.message_id}
                mail={mail}
                isChecked={selectedIds.has(mail.message_id)}
                hasSelection={hasSelection}
                onToggleSelect={() => toggleSelect(mail.message_id)}
              />
            ))}
          </div>
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
              aria-label="Previous page"
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
              aria-label="Next page"
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
