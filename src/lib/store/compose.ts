import { create } from "zustand";
import type { WalletClient } from "viem";
import type { PersonItem, MailDetail } from "@/lib/constants";
import { MetaMailType, EMAIL_DOMAIN } from "@/lib/constants";
import { mailApi } from "@/lib/api/mail";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "./auth";
import { useMailStore } from "./mail";
import {
  generateRandomBits,
  encryptMailContent,
  decryptMailContent,
  encryptMailKey,
  encryptAttachmentForUpload,
  getOrDecryptPrivateKey,
  decryptMailKey,
  sha256Hex,
} from "@/lib/crypto";
import { signMailMessage } from "@/lib/crypto/sign-mail";

export type ComposeMode = "new" | "reply" | "forward";

interface ComposeAttachment {
  file?: File;
  attachment_id?: string;
  filename: string;
  size: number;
  content_type: string;
  uploading?: boolean;
  progress?: number;
  encrypted_sha256?: string;
  plain_sha256?: string;
}

interface ComposeState {
  isOpen: boolean;
  mode: ComposeMode;
  messageId: string;
  inReplyTo: string;
  references: string[];
  mailTo: PersonItem[];
  mailCc: PersonItem[];
  mailBcc: PersonItem[];
  subject: string;
  bodyText: string;
  randomBits: string;
  attachments: ComposeAttachment[];
  sending: boolean;
  saving: boolean;
  sendError: string | null;
  isDirty: boolean;
  lastSavedAt: string | null;

  openCompose: (options?: {
    mode?: ComposeMode;
    replyTo?: MailDetail;
  }) => void;
  openDraft: (mail: MailDetail, walletClient: WalletClient) => Promise<void>;
  closeCompose: () => void;
  setMailTo: (to: PersonItem[]) => void;
  setMailCc: (cc: PersonItem[]) => void;
  setMailBcc: (bcc: PersonItem[]) => void;
  setSubject: (subject: string) => void;
  setBodyText: (text: string) => void;
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (index: number) => void;
  saveDraft: (walletClient: WalletClient) => Promise<void>;
  sendMail: (walletClient: WalletClient) => Promise<void>;
}

function buildReplySubject(subject: string): string {
  if (/^re:/i.test(subject)) return subject;
  return `Re: ${subject}`;
}

function buildForwardSubject(subject: string): string {
  if (/^fwd?:/i.test(subject)) return subject;
  return `Fwd: ${subject}`;
}

function buildFrom(): PersonItem {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error("Not logged in");
  return {
    name: user.ensName || user.address,
    address: `${user.ensName || user.address}@${EMAIL_DOMAIN}`,
  };
}

/**
 * Encrypt randomBits for the sender and build meta_header.
 * This is needed for every draft save so it can be reopened later.
 */
async function buildDraftMetaHeader(
  randomBits: string,
  walletClient: WalletClient
): Promise<{
  encrypted_encryption_keys: string[];
  encryption_public_keys: string[];
}> {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error("Not logged in");
  const privateKey = await getOrDecryptPrivateKey(walletClient);
  const encKey = await encryptMailKey(randomBits, privateKey, user.publicKey);
  return {
    encrypted_encryption_keys: [encKey],
    encryption_public_keys: [user.publicKey],
  };
}

export const useComposeStore = create<ComposeState>((set, get) => ({
  isOpen: false,
  mode: "new",
  messageId: "",
  inReplyTo: "",
  references: [],
  mailTo: [],
  mailCc: [],
  mailBcc: [],
  subject: "",
  bodyText: "",
  randomBits: "",
  attachments: [],
  sending: false,
  saving: false,
  sendError: null,
  isDirty: false,
  lastSavedAt: null,

  openCompose: (options) => {
    const user = useAuthStore.getState().user;
    const addr = user?.address || "";
    const rb = generateRandomBits(addr);

    if (options?.mode === "reply" && options.replyTo) {
      const mail = options.replyTo;
      const replyTo = mail.reply_to || mail.mail_from;
      set({
        isOpen: true,
        mode: "reply",
        messageId: "",
        inReplyTo: mail.message_id,
        references: [...(mail.mail_reference || []), mail.message_id],
        mailTo: [replyTo],
        mailCc: [],
        mailBcc: [],
        subject: buildReplySubject(mail.subject),
        bodyText: "",
        randomBits: rb,
        attachments: [],
        sending: false,
        saving: false,
        sendError: null,
        isDirty: false,
        lastSavedAt: null,
      });
    } else if (options?.mode === "forward" && options.replyTo) {
      const mail = options.replyTo;
      set({
        isOpen: true,
        mode: "forward",
        messageId: "",
        inReplyTo: "",
        references: [],
        mailTo: [],
        mailCc: [],
        mailBcc: [],
        subject: buildForwardSubject(mail.subject),
        bodyText: mail.part_text || "",
        randomBits: rb,
        attachments: [],
        sending: false,
        saving: false,
        sendError: null,
        isDirty: false,
        lastSavedAt: null,
      });
    } else {
      set({
        isOpen: true,
        mode: "new",
        messageId: "",
        inReplyTo: "",
        references: [],
        mailTo: [],
        mailCc: [],
        mailBcc: [],
        subject: "",
        bodyText: "",
        randomBits: rb,
        attachments: [],
        sending: false,
        saving: false,
        sendError: null,
        isDirty: false,
        lastSavedAt: null,
      });
    }
  },

  openDraft: async (mail, walletClient) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Not logged in");

    let bodyText = "";
    let rb = "";

    const hasEncryptionKeys =
      !!mail.meta_header?.encrypted_encryption_keys?.length &&
      !!mail.meta_header?.encryption_public_keys?.length;

    if (hasEncryptionKeys) {
      // Drafts are always encrypted. Decrypt using sender's key (index 0).
      const privateKey = await getOrDecryptPrivateKey(walletClient);
      rb = await decryptMailKey(
        mail.meta_header.encrypted_encryption_keys![0],
        privateKey,
        mail.meta_header.encryption_public_keys![0]
      );
      if (mail.part_text) {
        bodyText = decryptMailContent(mail.part_text, rb);
      }
    } else {
      // Legacy draft without meta_header — encrypted content cannot be recovered
      console.warn("Draft has no encryption keys in meta_header, content cannot be decrypted");
    }

    // If we couldn't recover randomBits, generate new ones for future saves
    if (!rb) {
      rb = generateRandomBits(user.address);
    }

    // Map existing attachments
    const attachments: ComposeAttachment[] = (mail.attachments || []).map(
      (att) => ({
        attachment_id: att.attachment_id,
        filename: att.filename,
        size: att.size,
        content_type: att.content_type,
        encrypted_sha256: att.encrypted_sha256,
        plain_sha256: att.plain_sha256,
      })
    );

    set({
      isOpen: true,
      mode: "new",
      messageId: mail.message_id,
      inReplyTo: mail.in_reply_to || "",
      references: mail.mail_reference || [],
      mailTo: mail.mail_to || [],
      mailCc: mail.mail_cc || [],
      mailBcc: mail.mail_bcc || [],
      subject: mail.subject || "",
      bodyText,
      randomBits: rb,
      attachments,
      sending: false,
      saving: false,
      sendError: null,
      isDirty: false,
      lastSavedAt: null,
    });
  },

  closeCompose: async () => {
    // Save before closing if dirty — fire-and-forget with dynamic wallet import
    const state = get();
    if (state.isDirty && !state.saving && !state.sending) {
      try {
        const { getWalletClient } = await import("wagmi/actions");
        const { wagmiConfig } = await import("@/config/wagmi");
        const walletClient = await getWalletClient(wagmiConfig);
        await state.saveDraft(walletClient);
      } catch {
        // Best-effort — don't block close
      }
    }
    set({ isOpen: false });
  },

  setMailTo: (to) => set({ mailTo: to, isDirty: true }),
  setMailCc: (cc) => set({ mailCc: cc, isDirty: true }),
  setMailBcc: (bcc) => set({ mailBcc: bcc, isDirty: true }),
  setSubject: (subject) => set({ subject, isDirty: true }),
  setBodyText: (text) => set({ bodyText: text, isDirty: true }),

  addAttachment: async (file) => {
    const state = get();
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Add to UI immediately in uploading state
    const tempIndex = state.attachments.length;
    set((s) => ({
      attachments: [
        ...s.attachments,
        {
          file,
          filename: file.name,
          size: file.size,
          content_type: file.type || "application/octet-stream",
          uploading: true,
          progress: 0,
        },
      ],
    }));

    try {
      // Ensure draft exists (need mail_id for upload)
      let { messageId } = get();
      if (!messageId) {
        const from = buildFrom();
        const s = get();
        const encryptedText = s.bodyText
          ? encryptMailContent(s.bodyText, s.randomBits)
          : undefined;
        const res = await mailApi.createOrUpdateDraft({
          mail_from: from,
          mail_to: s.mailTo,
          mail_cc: s.mailCc,
          mail_bcc: s.mailBcc,
          subject: s.subject,
          part_text: encryptedText,
          meta_type: MetaMailType.Encrypted,
        });
        messageId = res.message_id;
        set({ messageId });
      }

      // Encrypt the file
      const { encryptedFile, plainSha256, encryptedSha256 } =
        await encryptAttachmentForUpload(file, get().randomBits);

      // Build FormData
      const formData = new FormData();
      formData.append("attachment", encryptedFile);
      formData.append("encrypted_sha256", encryptedSha256);
      formData.append("plain_sha256", plainSha256);
      formData.append("related", "0");
      formData.append("mail_id", btoa(messageId));

      // Upload
      const result = await mailApi.uploadAttachment(formData, (progress) => {
        set((s) => ({
          attachments: s.attachments.map((a, i) =>
            i === tempIndex ? { ...a, progress } : a
          ),
        }));
      });

      // Mark as uploaded
      set((s) => ({
        attachments: s.attachments.map((a, i) =>
          i === tempIndex
            ? {
                ...a,
                uploading: false,
                attachment_id: result.attachment_id,
                encrypted_sha256: encryptedSha256,
                plain_sha256: plainSha256,
              }
            : a
        ),
      }));
    } catch (err) {
      console.error("Attachment upload failed:", err);
      // Remove the failed attachment
      set((s) => ({
        attachments: s.attachments.filter((_, i) => i !== tempIndex),
        sendError: "Failed to upload attachment",
      }));
    }
  },

  removeAttachment: (index) => {
    const state = get();
    const att = state.attachments[index];

    // Delete from server if uploaded
    if (att?.attachment_id && state.messageId) {
      mailApi
        .deleteAttachment(state.messageId, att.attachment_id)
        .catch((err) => console.error("Failed to delete attachment:", err));
    }

    set((s) => ({
      attachments: s.attachments.filter((_, i) => i !== index),
    }));
  },

  saveDraft: async (walletClient) => {
    const state = get();
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Not logged in");

    set({ saving: true, sendError: null });
    try {
      const from = buildFrom();

      // Drafts are always encrypted
      const encryptedText = state.bodyText
        ? encryptMailContent(state.bodyText, state.randomBits)
        : undefined;

      const metaHeader = await buildDraftMetaHeader(
        state.randomBits,
        walletClient
      );

      const isExistingDraft = state.messageId !== "";
      const res = await mailApi.createOrUpdateDraft({
        ...(isExistingDraft ? { mail_id: btoa(state.messageId) } : {}),
        mail_from: from,
        mail_to: state.mailTo,
        mail_cc: state.mailCc,
        mail_bcc: state.mailBcc,
        subject: state.subject,
        part_text: encryptedText,
        meta_type: MetaMailType.Encrypted,
        meta_header: metaHeader,
        ...(state.inReplyTo ? { in_reply_to: state.inReplyTo } : {}),
      });

      if (res.message_id && res.message_id !== state.messageId) {
        set({ messageId: res.message_id });
      }
      set({ isDirty: false, lastSavedAt: new Date().toISOString() });
    } finally {
      set({ saving: false });
    }
  },

  sendMail: async (walletClient) => {
    const state = get();
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Not logged in");

    if (state.mailTo.length === 0) {
      set({ sendError: "Please add at least one recipient." });
      return;
    }

    set({ sending: true, sendError: null });
    try {
      const from = buildFrom();

      // 1. Encrypt content with randomBits (always encrypted in draft)
      const encryptedText = state.bodyText
        ? encryptMailContent(state.bodyText, state.randomBits)
        : "";
      const encryptedHtml = "";

      // 2. Save draft with meta_header
      const metaHeader = await buildDraftMetaHeader(
        state.randomBits,
        walletClient
      );
      const isExistingDraft = state.messageId !== "";
      const draftRes = await mailApi.createOrUpdateDraft({
        ...(isExistingDraft ? { mail_id: btoa(state.messageId) } : {}),
        mail_from: from,
        mail_to: state.mailTo,
        mail_cc: state.mailCc,
        mail_bcc: state.mailBcc,
        subject: state.subject,
        part_text: encryptedText || undefined,
        part_html: encryptedHtml || undefined,
        meta_type: MetaMailType.Encrypted,
        meta_header: metaHeader,
        ...(state.inReplyTo ? { in_reply_to: state.inReplyTo } : {}),
      });

      const messageId = draftRes.message_id;
      set({ messageId });

      // 3. Fetch each recipient's public key to determine encryptable
      const allRecipients = [...state.mailTo, ...state.mailCc];
      const recipientPublicKeys: string[] = [];
      let encryptable = allRecipients.length > 0;

      for (const recipient of allRecipients) {
        const prefix = recipient.address.split("@")[0];
        try {
          const keyData = await authApi.getEncryptionKey(prefix);
          if (keyData?.public_key) {
            recipientPublicKeys.push(keyData.public_key);
          } else {
            encryptable = false;
            recipientPublicKeys.push("");
          }
        } catch {
          encryptable = false;
          recipientPublicKeys.push("");
        }
      }

      const encryptedEncryptionKeys: string[] = [];
      let encryptionPublicKeys: string[] = [];
      let mailDecryptionKey = "";

      if (encryptable) {
        const senderPrivateKey = await getOrDecryptPrivateKey(walletClient);
        const senderPublicKey = user.publicKey;
        const allPublicKeys = [senderPublicKey, ...recipientPublicKeys];
        for (const pubKey of allPublicKeys) {
          const encKey = await encryptMailKey(
            state.randomBits,
            senderPrivateKey,
            pubKey
          );
          encryptedEncryptionKeys.push(encKey);
        }
        encryptionPublicKeys = allPublicKeys;
      } else {
        mailDecryptionKey = state.randomBits;
      }

      // Compute content hashes
      let textForHash: string;
      let htmlForHash: string;
      if (encryptable) {
        textForHash = encryptedText;
        htmlForHash = encryptedHtml;
      } else {
        textForHash = encryptedText
          ? decryptMailContent(encryptedText, state.randomBits)
          : "";
        htmlForHash = encryptedHtml
          ? decryptMailContent(encryptedHtml, state.randomBits)
          : "";
      }
      const textHash = await sha256Hex(textForHash);
      const htmlHash = await sha256Hex(htmlForHash);

      // Collect attachment hashes (sorted by attachment_id like backend)
      const sortedAtts = [...state.attachments]
        .filter((a) => a.attachment_id)
        .sort((a, b) => (a.attachment_id! > b.attachment_id! ? 1 : -1));
      const attachmentHashes = sortedAtts
        .map((a) => (encryptable ? a.encrypted_sha256 : a.plain_sha256))
        .filter((h): h is string => !!h);

      const mailDate = new Date().toISOString();

      // Sign EIP-712 message
      const signature = await signMailMessage(walletClient, {
        from,
        to: state.mailTo,
        cc: state.mailCc,
        date: mailDate,
        subject: state.subject,
        textHash,
        htmlHash,
        attachmentHashes,
        encryptedEncryptionKeys,
        encryptionPublicKeys,
      });

      // Send
      await mailApi.sendMail({
        message_id: messageId,
        date: mailDate,
        signature,
        encrypted_encryption_keys: encryptedEncryptionKeys,
        encryption_public_keys: encryptionPublicKeys,
        mail_decryption_key: mailDecryptionKey,
      });

      // Refresh + close
      useMailStore.getState().fetchMails();
      useMailStore.getState().fetchStats();
      set({ isOpen: false });
    } catch (err: unknown) {
      const error = err as {
        code?: string | number;
        message?: string;
        response?: { data?: { error?: string }; status?: number };
      };
      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        set({ sending: false });
        return;
      }
      const backendMsg = error.response?.data?.error;
      console.error("Send failed:", err);
      if (backendMsg) console.error("Backend error:", backendMsg);
      set({
        sendError: backendMsg || error.message || "Failed to send mail",
      });
    } finally {
      set({ sending: false });
    }
  },
}));
