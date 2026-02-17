"use client";

import { useRef, useState, useEffect } from "react";
import { useWalletClient } from "wagmi";
import { useModal } from "connectkit";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./rich-text-editor";
import { RecipientInput } from "./recipient-input";
import { useComposeStore } from "@/lib/store/compose";
import { useAuthStore } from "@/lib/store/auth";
import { EMAIL_DOMAIN } from "@/lib/constants";
import { formatSize } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Save,
  Paperclip,
  X,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";


export function ComposeMail() {
  const { setOpen } = useModal();
  const { data: walletClient } = useWalletClient();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    isOpen,
    mode,
    mailTo,
    mailCc,
    mailBcc,
    subject,
    bodyHtml,
    attachments,
    sending,
    saving,
    sendError,
    lastSavedAt,
    closeCompose,
    setMailTo,
    setMailCc,
    setMailBcc,
    setSubject,
    setBody,
    addAttachment,
    removeAttachment,
    sendMail,
  } = useComposeStore();

  // Auto-show Cc/Bcc rows if they already have recipients (e.g. from a draft)
  useEffect(() => {
    if (mailCc.length > 0) setShowCc(true);
    if (mailBcc.length > 0) setShowBcc(true);
  }, [mailCc.length, mailBcc.length]);

  // Auto-save every 3 seconds when dirty
  useEffect(() => {
    if (!isOpen || !walletClient) return;

    const interval = setInterval(() => {
      const state = useComposeStore.getState();
      if (state.isDirty && !state.saving && !state.sending) {
        state.saveDraft(walletClient);
      }
    }, 3_000);

    return () => clearInterval(interval);
  }, [isOpen, walletClient]);

  // Auto-save on window blur / focus change
  useEffect(() => {
    if (!isOpen || !walletClient) return;

    const handleBlur = () => {
      const state = useComposeStore.getState();
      if (state.isDirty && !state.saving && !state.sending) {
        state.saveDraft(walletClient);
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handleBlur();
    });

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleBlur);
    };
  }, [isOpen, walletClient]);

  if (!isOpen) return null;

  const fromAddress = user
    ? `${user.ensName || user.address}@${EMAIL_DOMAIN}`
    : "";

  const handleSend = async () => {
    if (!walletClient) return;
    await sendMail(walletClient);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        addAttachment(files[i]);
      }
    }
    e.target.value = "";
  };

  const modeLabel =
    mode === "reply"
      ? "Reply"
      : mode === "forward"
        ? "Forward"
        : "New Message";

  return (
    <div
      className={`fixed z-30 flex flex-col bg-background border rounded-t-lg shadow-xl transition-all duration-200 ${
        isExpanded
          ? "inset-0 rounded-none"
          : "bottom-0 right-4 w-[600px] max-w-[calc(100vw-2rem)] h-[520px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-t-lg shrink-0">
        <h3 className="text-sm font-semibold">{modeLabel}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={isExpanded ? "Minimize" : "Maximize"}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Close compose"
            onClick={closeCompose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Wallet connect banner */}
      {!walletClient && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs text-amber-800 dark:text-amber-200 flex-1">
            Connect your wallet to save drafts and send mail.
          </span>
          <Button onClick={() => setOpen(true)} size="sm" variant="outline" className="h-6 text-xs px-2">
            Connect
          </Button>
        </div>
      )}

      {/* Inline field rows */}
      <div className="shrink-0">
        {/* From row */}
        <div className="flex items-center px-4 py-2 border-b">
          <span className="w-16 text-sm text-muted-foreground shrink-0">From</span>
          <span className="text-sm truncate">{fromAddress}</span>
        </div>

        {/* To row */}
        <div className="flex items-center px-4 py-2 border-b">
          <span className="w-16 text-sm text-muted-foreground shrink-0">To</span>
          <div className="flex-1 min-w-0">
            <RecipientInput recipients={mailTo} onChange={setMailTo} borderless />
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <button
              type="button"
              className={`text-sm hover:text-foreground ${showCc ? "text-foreground" : "text-muted-foreground"}`}
              onClick={() => {
                if (showCc && mailCc.length > 0) return;
                setShowCc(!showCc);
              }}
            >
              Cc
            </button>
            <button
              type="button"
              className={`text-sm hover:text-foreground ${showBcc ? "text-foreground" : "text-muted-foreground"}`}
              onClick={() => {
                if (showBcc && mailBcc.length > 0) return;
                setShowBcc(!showBcc);
              }}
            >
              Bcc
            </button>
          </div>
        </div>

        {/* Cc row */}
        {showCc && (
          <div className="flex items-center px-4 py-2 border-b">
            <span className="w-16 text-sm text-muted-foreground shrink-0">Cc</span>
            <div className="flex-1 min-w-0">
              <RecipientInput
                recipients={mailCc}
                onChange={setMailCc}
                placeholder="Add Cc..."
                borderless
              />
            </div>
          </div>
        )}

        {/* Bcc row */}
        {showBcc && (
          <div className="flex items-center px-4 py-2 border-b">
            <span className="w-16 text-sm text-muted-foreground shrink-0">Bcc</span>
            <div className="flex-1 min-w-0">
              <RecipientInput
                recipients={mailBcc}
                onChange={setMailBcc}
                placeholder="Add Bcc..."
                borderless
              />
            </div>
          </div>
        )}

        {/* Subject row */}
        <div className="flex items-center px-4 py-2 border-b">
          <span className="w-16 text-sm text-muted-foreground shrink-0">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Editor area — fills remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <RichTextEditor
          content={bodyHtml}
          onChange={setBody}
          placeholder="Write your message..."
          borderless
          className="h-full flex flex-col"
        />
      </div>

      {/* Attachments — horizontal chips */}
      {attachments.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-t overflow-x-auto shrink-0">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs shrink-0"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[120px]">{att.filename}</span>
              <span className="text-muted-foreground shrink-0">
                {formatSize(att.size)}
              </span>
              {att.uploading && (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              )}
              <button
                type="button"
                className="hover:text-destructive shrink-0"
                onClick={() => removeAttachment(i)}
                disabled={att.uploading}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 flex items-center gap-2 border-t shrink-0">
        {walletClient ? (
          <Button
            onClick={handleSend}
            disabled={sending || saving}
            size="sm"
            className="gap-1.5"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {sending ? "Sending..." : "Send"}
          </Button>
        ) : (
          <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
            Connect Wallet to Send
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Attach file</TooltipContent>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Discard"
              onClick={closeCompose}
              disabled={sending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Discard</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        {!saving && lastSavedAt && !sendError && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Save className="h-3 w-3" />
            Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}

        {sendError && (
          <div className="flex items-center gap-1.5 text-xs text-destructive max-w-[200px]">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="truncate">{sendError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
