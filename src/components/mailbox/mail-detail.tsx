"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMailStore } from "@/lib/store/mail";
import { useAuthStore } from "@/lib/store/auth";
import { useComposeStore } from "@/lib/store/compose";
import { MetaMailType, MarkType, FilterType, ReadStatus } from "@/lib/constants";
import { cn, formatSize } from "@/lib/utils";
import { decryptMail, decryptAttachment } from "@/lib/crypto";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Menu,
  Loader2,
  ShieldCheck,
  Star,
  Trash2,
  AlertCircle,
  Download,
  KeyRound,
  Reply,
  Forward,
  MailOpen,
  MailCheck,
  X,
} from "lucide-react";

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddress(person: { name: string; address: string }): string {
  if (person.name) return `${person.name} <${person.address}>`;
  return person.address;
}


function SandboxedHtml({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Listen for height messages from the iframe (since we can't access
    // contentDocument without allow-same-origin)
    const handleMessage = (e: MessageEvent) => {
      if (e.source === iframe.contentWindow && e.data?.type === "resize") {
        iframe.style.height = `${e.data.height}px`;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Inject a resize script that posts its height to the parent.
  // This runs inside the iframe (allow-scripts) but can't access
  // parent DOM (no allow-same-origin).
  const resizeScript = `<script>
function postHeight() {
  var h = document.documentElement.scrollHeight;
  parent.postMessage({ type: "resize", height: h }, "*");
}
window.addEventListener("load", postHeight);
new MutationObserver(postHeight).observe(document.body, { childList: true, subtree: true, attributes: true });
new ResizeObserver(postHeight).observe(document.body);
// Post initial height after a short delay for images etc.
setTimeout(postHeight, 100);
setTimeout(postHeight, 500);
<\/script>`;

  const srcdoc = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><base target="_blank"><style>
body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: #1a1a1a; word-break: break-word; overflow-wrap: break-word; }
img { max-width: 100%; height: auto; }
a { color: #2563eb; }
</style></head><body>${html}${resizeScript}</body></html>`;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-popups allow-downloads"
      className="w-full border-0 min-h-[100px]"
      title="Mail content"
    />
  );
}

interface MailDetailProps {
  onOpenSidebar?: () => void;
}

export function MailDetail({ onOpenSidebar }: MailDetailProps) {
  const {
    selectedMailDetail: mail,
    detailLoading,
    filter,
    selectMail,
    toggleStar,
    deleteMail,
    markAsRead,
    markAsUnread,
  } = useMailStore();

  const { data: walletClient } = useWalletClient();
  const { getCachedPrivateKey } = useAuthStore();

  const [decryptedHtml, setDecryptedHtml] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decryptedRandomBits, setDecryptedRandomBits] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const isEncrypted = mail?.meta_type === MetaMailType.Encrypted;
  const hasDecryptedContent = decryptedHtml !== null || decryptedText !== null;
  const hasCachedKey = getCachedPrivateKey() !== null;

  // Reset decrypted state when mail changes
  useEffect(() => {
    setDecryptedHtml(null);
    setDecryptedText(null);
    setDecryptedRandomBits(null);
    setDecryptError(null);
  }, [mail?.message_id]);

  // Auto-decrypt if private key is already cached in session
  useEffect(() => {
    if (mail && isEncrypted && !hasDecryptedContent && !decrypting && hasCachedKey && walletClient) {
      handleDecrypt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mail?.message_id, walletClient, hasCachedKey]);

  const handleDecrypt = useCallback(async () => {
    if (!mail || !walletClient) return;

    setDecrypting(true);
    setDecryptError(null);

    try {
      const result = await decryptMail(mail, walletClient);
      setDecryptedHtml(result.html);
      setDecryptedText(result.text);

      // Also store randomBits for attachment decryption
      // We re-derive it here by importing the function
      const { getOrDecryptPrivateKey, decryptMailKey: decryptKey } = await import("@/lib/crypto/mail");
      const { useAuthStore: getAuth } = await import("@/lib/store/auth");
      const user = getAuth.getState().user;
      if (user && mail.meta_header?.encrypted_encryption_keys && mail.meta_header?.encryption_public_keys) {
        const privateKey = await getOrDecryptPrivateKey(walletClient);
        // Find user's key index
        const addrList = [
          mail.mail_from.address,
          ...(mail.mail_to?.map((p) => p.address) || []),
          ...(mail.mail_cc?.map((p) => p.address) || []),
          ...(mail.mail_bcc?.map((p) => p.address) || []),
        ];
        const idx = addrList.findIndex((addr) => {
          const prefix = addr?.split("@")[0]?.toLowerCase();
          return prefix === user.address || prefix === user.ensName;
        });
        if (idx >= 0 && idx < mail.meta_header.encrypted_encryption_keys.length) {
          const randomBits = await decryptKey(
            mail.meta_header.encrypted_encryption_keys[idx],
            privateKey,
            mail.meta_header.encryption_public_keys[0]
          );
          setDecryptedRandomBits(randomBits);
        }
      }
    } catch (err: unknown) {
      const error = err as { code?: string | number; message?: string };
      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        setDecryptError(null);
        return;
      }
      console.error("Decryption failed:", err);
      setDecryptError(error.message || "Failed to decrypt mail");
    } finally {
      setDecrypting(false);
    }
  }, [mail, walletClient]);

  const handleDownloadAttachment = async (att: {
    attachment_id: string;
    filename: string;
    content_type: string;
    download: { url: string };
  }) => {
    setDownloadingId(att.attachment_id);
    try {
      let blob: Blob;

      if (isEncrypted && decryptedRandomBits) {
        blob = await decryptAttachment(
          att.download.url,
          decryptedRandomBits,
          att.content_type
        );
      } else {
        const response = await fetch(att.download.url);
        blob = await response.blob();
      }

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (!mail && !detailLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select a message to read</p>
      </div>
    );
  }

  const isStarred = mail?.mark === MarkType.Starred;

  // Determine what content to show
  const displayHtml = isEncrypted ? decryptedHtml : mail?.part_html;
  const displayText = isEncrypted ? decryptedText : mail?.part_text;
  const needsDecryption = isEncrypted && !hasDecryptedContent && !decrypting;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — always static */}
      <div className="flex items-center gap-2 px-4 py-3 border-b min-h-[52px]">
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden shrink-0"
            aria-label="Open menu"
            onClick={onOpenSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Back to mail list"
              onClick={() => selectMail(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Back</TooltipContent>
        </Tooltip>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Reply"
              disabled={!mail}
              onClick={() =>
                mail && useComposeStore
                  .getState()
                  .openCompose({ mode: "reply", replyTo: mail })
              }
            >
              <Reply className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Reply</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Forward"
              disabled={!mail}
              onClick={() =>
                mail && useComposeStore
                  .getState()
                  .openCompose({ mode: "forward", replyTo: mail })
              }
            >
              <Forward className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Forward</TooltipContent>
        </Tooltip>
        {mail?.read === ReadStatus.Unread ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Mark as read"
                onClick={() => mail && markAsRead(mail)}
              >
                <MailCheck className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Mark Read</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Mark as unread"
                disabled={!mail}
                onClick={() => mail && markAsUnread(mail)}
              >
                <MailOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Mark Unread</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={isStarred ? "Unstar" : "Star"}
              disabled={!mail}
              onClick={() => mail && toggleStar(mail)}
            >
              <Star
                className={
                  isStarred
                    ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                    : "h-4 w-4"
                }
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isStarred ? "Unstar" : "Star"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", filter === FilterType.Trash && "text-destructive hover:text-destructive")}
              aria-label={filter === FilterType.Trash ? "Delete forever" : "Move to trash"}
              disabled={!mail}
              onClick={() => mail && deleteMail(mail)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{filter === FilterType.Trash ? "Delete Forever" : "Trash"}</TooltipContent>
        </Tooltip>
        {filter !== FilterType.Trash && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Report spam"
                disabled={!mail}
                onClick={() => mail && useMailStore.getState().moveTo(mail, MarkType.Spam)}
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Spam</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Close"
              onClick={() => selectMail(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Close</TooltipContent>
        </Tooltip>
      </div>

      {/* Mail content */}
      {!mail && detailLoading ? (
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ) : mail ? (
      <ScrollArea key={mail.message_id} className="flex-1 animate-in fade-in duration-200">
        <div className="p-6 max-w-3xl mx-auto">
          {/* Subject */}
          <div className="flex items-start gap-3 mb-4">
            <h1 className="text-xl font-semibold flex-1">
              {mail.subject || "(No Subject)"}
            </h1>
            {isEncrypted && (
              <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                End-to-End Encrypted
              </span>
            )}
          </div>

          {/* From / To / Date */}
          <div className="space-y-1 text-sm mb-4">
            <div>
              <span className="text-muted-foreground">From: </span>
              <span>{formatAddress(mail.mail_from)}</span>
            </div>
            {mail.mail_to.length > 0 && (
              <div>
                <span className="text-muted-foreground">To: </span>
                <span>{mail.mail_to.map(formatAddress).join(", ")}</span>
              </div>
            )}
            {mail.mail_cc && mail.mail_cc.length > 0 && (
              <div>
                <span className="text-muted-foreground">Cc: </span>
                <span>{mail.mail_cc.map(formatAddress).join(", ")}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Date: </span>
              <span>{formatFullDate(mail.mail_date)}</span>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Body loading skeleton */}
          {detailLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {/* Decryption prompt */}
          {needsDecryption && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ShieldCheck className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">This message is encrypted</p>
              <p className="text-sm text-muted-foreground mb-6">
                {hasCachedKey
                  ? "Click to decrypt this message."
                  : "Connect your wallet and sign to decrypt this message."}
              </p>
              {walletClient ? (
                <Button onClick={handleDecrypt} className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  Decrypt Message
                </Button>
              ) : (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button onClick={openConnectModal} className="gap-2">
                      <KeyRound className="h-4 w-4" />
                      Connect Wallet to Decrypt
                    </Button>
                  )}
                </ConnectButton.Custom>
              )}
              {decryptError && (
                <p className="text-sm text-destructive mt-4">{decryptError}</p>
              )}
            </div>
          )}

          {/* Decrypting spinner */}
          {decrypting && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Decrypting message...
              </p>
            </div>
          )}

          {/* Body content */}
          {!needsDecryption && !decrypting && (displayHtml || displayText) && (
            <div className="prose prose-sm max-w-none">
              {displayHtml ? (
                <SandboxedHtml html={displayHtml} />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {displayText || ""}
                </pre>
              )}
            </div>
          )}

          {/* Decryption error */}
          {decryptError && !needsDecryption && (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-sm text-destructive mb-4">{decryptError}</p>
              <Button
                variant="outline"
                onClick={handleDecrypt}
                className="gap-2"
              >
                <KeyRound className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Attachments */}
          {mail.attachments && mail.attachments.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Attachments ({mail.attachments.length})
                </h3>
                <div className="space-y-2">
                  {mail.attachments.map((att) => (
                    <div
                      key={att.attachment_id}
                      className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                    >
                      <span className="flex-1 truncate">{att.filename}</span>
                      <span className="text-muted-foreground shrink-0">
                        {formatSize(att.size)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label={`Download ${att.filename}`}
                        disabled={
                          downloadingId === att.attachment_id ||
                          (isEncrypted && !decryptedRandomBits)
                        }
                        onClick={() => handleDownloadAttachment(att)}
                      >
                        {downloadingId === att.attachment_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
      ) : null}
    </div>
  );
}
