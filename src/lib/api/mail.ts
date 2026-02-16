import axios from "axios";
import { apiClient } from "./client";
import {
  API_BASE_URL,
  FilterType,
  MailItem,
  MailDetail,
  MarkType,
  ReadStatus,
  MailBoxType,
  PersonItem,
} from "@/lib/constants";

export interface MailListResponse {
  total: number;
  page_num: number;
  page_index: number;
  mails: MailItem[];
}

export interface MailStatResponse {
  unread: number;
  spam: number;
  draft: number;
}

export interface MailStatusUpdate {
  message_id: string;
  mailbox: MailBoxType;
}

export const mailApi = {
  getMailList(
    filter: FilterType,
    pageIndex: number,
    limit: number = 30
  ): Promise<MailListResponse> {
    return apiClient.post("/mails/filter", {
      filter,
      page_index: pageIndex,
      limit,
    });
  },

  searchMails(
    keyword: string,
    filter?: FilterType,
    pageIndex: number = 1,
    limit: number = 30
  ): Promise<MailListResponse> {
    return apiClient.post("/mails/search", {
      keyword,
      filter,
      page_index: pageIndex,
      limit,
    });
  },

  getMailDetail(mailId: string): Promise<MailDetail> {
    return apiClient.get("/mails", {
      params: { mail_id: btoa(mailId) },
    });
  },

  batchGetMails(messageIds: string[], mailbox?: MailBoxType): Promise<MailDetail[]> {
    const body: Record<string, unknown> = { message_ids: messageIds };
    if (mailbox !== undefined) body.mailbox = mailbox;
    return apiClient.post("/mails/batch", body);
  },

  getMailStat(): Promise<MailStatResponse> {
    return apiClient.get("/mails/stat");
  },

  updateMailStatus(
    mails: MailStatusUpdate[],
    updates: { mark?: MarkType; read?: ReadStatus }
  ): Promise<{ mails: MailStatusUpdate[] }> {
    return apiClient.post("/mails", { mails, ...updates });
  },

  getSuggestedReceivers(
    prefix: string
  ): Promise<{ suggestions: string[] }> {
    return apiClient.get("/mails/suggested_receivers", {
      params: { prefix },
    });
  },

  createOrUpdateDraft(params: {
    mail_id?: string;
    mail_from: PersonItem;
    mail_to: PersonItem[];
    mail_cc?: PersonItem[];
    mail_bcc?: PersonItem[];
    subject: string;
    part_html?: string;
    part_text?: string;
    meta_type: number;
    in_reply_to?: string;
    meta_header?: {
      encrypted_encryption_keys: string[];
      encryption_public_keys: string[];
    };
  }): Promise<{ message_id: string; mail_date: string }> {
    return apiClient.patch("/mails", params);
  },

  sendMail(params: {
    message_id: string;
    date: string;
    signature: string;
    encrypted_encryption_keys: string[];
    encryption_public_keys: string[];
    mail_decryption_key: string;
  }): Promise<{ message_id: string }> {
    return apiClient.post("/mails/send", {
      ...params,
      mail_id: btoa(params.message_id),
    });
  },

  async uploadAttachment(
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<{ attachment_id: string }> {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("mm_token")
        : null;
    const res = await axios.post(`${API_BASE_URL}/mails/attachments`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return res.data?.data;
  },

  deleteAttachment(
    mailId: string,
    attachmentId: string
  ): Promise<void> {
    return apiClient.delete("/mails/attachments", {
      data: {
        mail_id: btoa(mailId),
        attachment_id: attachmentId,
      },
    });
  },
};
