"use client";

import { useRef, useState, useEffect } from "react";
import { useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RecipientInput } from "./recipient-input";
import { useComposeStore } from "@/lib/store/compose";
import { useAuthStore } from "@/lib/store/auth";
import { EMAIL_DOMAIN } from "@/lib/constants";
import {
  Send,
  Save,
  Paperclip,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ComposeMail() {
  const { data: walletClient } = useWalletClient();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    isOpen,
    mode,
    mailTo,
    mailCc,
    mailBcc,
    subject,
    bodyText,
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
    setBodyText,
    addAttachment,
    removeAttachment,
    sendMail,
  } = useComposeStore();

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
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 rounded-t-lg shrink-0">
        <h3 className="text-sm font-semibold">{modeLabel}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
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
            onClick={closeCompose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Wallet connect banner */}
      {!walletClient && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-800 flex-1">
            Connect your wallet to save drafts and send mail.
          </span>
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button onClick={openConnectModal} size="sm" variant="outline" className="h-6 text-xs px-2">
                Connect
              </Button>
            )}
          </ConnectButton.Custom>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* From */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input value={fromAddress} disabled className="bg-muted h-8 text-sm" />
        </div>

        {/* To */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs text-muted-foreground"
              onClick={() => setShowCcBcc(!showCcBcc)}
            >
              Cc/Bcc
              {showCcBcc ? (
                <ChevronUp className="ml-1 h-3 w-3" />
              ) : (
                <ChevronDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          </div>
          <RecipientInput recipients={mailTo} onChange={setMailTo} />
        </div>

        {/* Cc/Bcc */}
        {showCcBcc && (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cc</Label>
              <RecipientInput
                recipients={mailCc}
                onChange={setMailCc}
                placeholder="Add Cc..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Bcc</Label>
              <RecipientInput
                recipients={mailBcc}
                onChange={setMailBcc}
                placeholder="Add Bcc..."
              />
            </div>
          </>
        )}

        {/* Subject */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="h-8 text-sm"
          />
        </div>

        {/* Body */}
        <Textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder="Write your message..."
          className="min-h-[120px] resize-none flex-1 text-sm"
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Attachments
            </Label>
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
              >
                <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{att.filename}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatSize(att.size)}
                </span>
                {att.uploading && (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => removeAttachment(i)}
                  disabled={att.uploading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Footer */}
      <div className="px-4 py-2.5 flex items-center gap-2 shrink-0">
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
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button onClick={openConnectModal} size="sm" className="gap-1.5">
                Connect Wallet to Send
              </Button>
            )}
          </ConnectButton.Custom>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

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
