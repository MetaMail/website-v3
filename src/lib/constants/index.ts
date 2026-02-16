export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api-v2.metamail.ink";

export const EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "mmail.ink";

export const EIP712_DOMAIN = {
  name: "MetaMail",
  version: "1.0.0",
} as const;

export const EIP712_SALT_TYPES: Record<
  string,
  Array<{ name: string; type: string }>
> = {
  Sign_Salt: [
    { name: "hint", type: "string" },
    { name: "salt", type: "string" },
  ],
};

export const EIP712_KEY_DATA_TYPES: Record<
  string,
  Array<{ name: string; type: string }>
> = {
  Sign_KeyData: [
    { name: "date", type: "string" },
    { name: "salt", type: "string" },
    { name: "keys_hash", type: "string" },
    { name: "keys_meta", type: "string" },
  ],
};

export const EIP712_MAIL_TYPES: Record<
  string,
  Array<{ name: string; type: string }>
> = {
  Sign_Mail: [
    { name: "from", type: "string" },
    { name: "to", type: "string[]" },
    { name: "cc", type: "string[]" },
    { name: "date", type: "string" },
    { name: "subject", type: "string" },
    { name: "text_hash", type: "string" },
    { name: "html_hash", type: "string" },
    { name: "attachment_hashes", type: "string[]" },
    { name: "encrypted_encryption_key_hashes", type: "string[]" },
    { name: "encryption_public_key_hashes", type: "string[]" },
  ],
};

// Mail-related enums
export enum MailBoxType {
  Inbox = 0,
  Sent = 1,
  Draft = 2,
}

export enum MetaMailType {
  Plain = 0,
  Signed = 1,
  Encrypted = 2,
}

export enum ReadStatus {
  Unread = 0,
  Read = 1,
}

export enum MarkType {
  Normal = 0,
  Starred = 1,
  Trash = 2,
  Spam = 3,
  Deleted = 4,
}

export enum FilterType {
  Inbox = 0,
  Encrypted = 1,
  Sent = 2,
  Trash = 3,
  Draft = 4,
  Starred = 5,
  Spam = 6,
  Read = 7,
  Unread = 8,
}

export interface PersonItem {
  name: string;
  address: string;
}

export interface MailItem {
  message_id: string;
  mailbox: MailBoxType;
  mark: MarkType;
  read: ReadStatus;
  meta_type: MetaMailType;
  meta_header: {
    encrypted_encryption_keys?: string[];
    encryption_public_keys?: string[];
  };
  subject: string;
  mail_from: PersonItem;
  mail_to: PersonItem[];
  mail_cc: PersonItem[];
  mail_bcc: PersonItem[];
  mail_date: string;
  in_reply_to?: string;
  reply_to?: PersonItem;
  mail_reference?: string[];
  digest?: string;
}

export interface MailDetail extends MailItem {
  part_text?: string;
  part_html?: string;
  download?: {
    url: string;
    expire_at: string;
  };
  attachments?: AttachmentItem[];
  origin_text?: string;
  origin_html?: string;
}

export interface AttachmentItem {
  attachment_id: string;
  filename: string;
  content_type: string;
  size: number;
  encrypted_sha256?: string;
  plain_sha256?: string;
  download: {
    url: string;
    expire_at: string;
  };
}
