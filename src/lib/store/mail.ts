import { create } from "zustand";
import {
  FilterType,
  MailItem,
  MailDetail,
  MailBoxType,
  MarkType,
  ReadStatus,
} from "@/lib/constants";
import { mailApi } from "@/lib/api/mail";

interface MailState {
  // Filters & pagination
  filter: FilterType;
  pageIndex: number;
  pageCount: number;
  total: number;

  // Mail list
  mails: MailItem[];
  loading: boolean;

  // Stats
  unreadCount: number;
  spamCount: number;
  draftCount: number;

  // Selected mail for detail view
  selectedMailId: string | null;
  selectedMailDetail: MailDetail | null;
  detailLoading: boolean;

  // Batch selection
  selectedIds: Set<string>;

  // Actions
  setFilter: (filter: FilterType) => void;
  setPage: (page: number) => void;
  fetchMails: () => Promise<void>;
  fetchStats: () => Promise<void>;
  selectMail: (messageId: string | null) => Promise<void>;
  markAsRead: (mail: MailItem) => Promise<void>;
  markAsUnread: (mail: MailItem) => Promise<void>;
  toggleStar: (mail: MailItem) => Promise<void>;
  moveTo: (mail: MailItem, mark: MarkType) => Promise<void>;
  deleteMail: (mail: MailItem) => Promise<void>;

  // Batch actions
  toggleSelect: (messageId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  batchDelete: () => Promise<void>;
  batchMarkRead: () => Promise<void>;
  batchMarkUnread: () => Promise<void>;
  batchStar: () => Promise<void>;
  emptyTrash: () => Promise<void>;
}

export const useMailStore = create<MailState>((set, get) => ({
  filter: FilterType.Inbox,
  pageIndex: 1,
  pageCount: 0,
  total: 0,
  mails: [],
  loading: false,
  unreadCount: 0,
  spamCount: 0,
  draftCount: 0,
  selectedMailId: null,
  selectedMailDetail: null,
  detailLoading: false,
  selectedIds: new Set<string>(),

  setFilter: (filter) => {
    set({ filter, pageIndex: 1, selectedMailId: null, selectedMailDetail: null, selectedIds: new Set() });
    get().fetchMails();
  },

  setPage: (page) => {
    set({ pageIndex: page, selectedIds: new Set() });
    get().fetchMails();
  },

  fetchMails: async () => {
    const { filter, pageIndex } = get();
    set({ loading: true });
    try {
      const res = await mailApi.getMailList(filter, pageIndex);
      set({
        mails: res.mails || [],
        pageCount: res.page_num,
        total: res.total,
        selectedIds: new Set(),
      });
    } catch (err) {
      console.error("Failed to fetch mails:", err);
      set({ mails: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await mailApi.getMailStat();
      set({
        unreadCount: stats.unread,
        spamCount: stats.spam,
        draftCount: stats.draft,
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  },

  selectMail: async (messageId) => {
    if (!messageId) {
      set({ selectedMailId: null, selectedMailDetail: null });
      return;
    }

    // Check if this is a draft — if so, open in compose mode
    const mail = get().mails.find((m) => m.message_id === messageId);
    if (mail && mail.mailbox === MailBoxType.Draft) {
      set({ detailLoading: true });
      try {
        const results = await mailApi.batchGetMails([messageId]);
        const detail = results?.[0];
        if (!detail) throw new Error("Draft not found");
        // Import compose store dynamically to avoid circular deps
        const { useComposeStore } = await import("./compose");
        // walletClient is required to decrypt the draft
        const { getWalletClient } = await import("wagmi/actions");
        const { wagmiConfig } = await import("@/config/wagmi");
        const walletClient = await getWalletClient(wagmiConfig);
        await useComposeStore.getState().openDraft(detail, walletClient);
      } catch (err) {
        console.error("Failed to open draft:", err);
      } finally {
        set({ detailLoading: false });
      }
      return;
    }

    set({ selectedMailId: messageId, detailLoading: true });
    try {
      const results = await mailApi.batchGetMails([messageId]);
      const detail = results?.[0];
      if (!detail) throw new Error("Mail not found");
      set({ selectedMailDetail: detail, detailLoading: false });

      // Mark as read if unread
      if (mail && mail.read === ReadStatus.Unread) {
        get().markAsRead(mail);
      }
    } catch (err) {
      console.error("Failed to fetch mail detail:", err);
      set({ detailLoading: false });
    }
  },

  markAsRead: async (mail) => {
    try {
      await mailApi.updateMailStatus(
        [{ message_id: mail.message_id, mailbox: mail.mailbox }],
        { read: ReadStatus.Read }
      );
      // Update local state
      set((state) => ({
        mails: state.mails.map((m) =>
          m.message_id === mail.message_id ? { ...m, read: ReadStatus.Read } : m
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  },

  markAsUnread: async (mail) => {
    try {
      await mailApi.updateMailStatus(
        [{ message_id: mail.message_id, mailbox: mail.mailbox }],
        { read: ReadStatus.Unread }
      );
      set((state) => ({
        mails: state.mails.map((m) =>
          m.message_id === mail.message_id ? { ...m, read: ReadStatus.Unread } : m
        ),
        unreadCount: state.unreadCount + 1,
      }));
    } catch (err) {
      console.error("Failed to mark as unread:", err);
    }
  },

  toggleStar: async (mail) => {
    const newMark =
      mail.mark === MarkType.Starred ? MarkType.Normal : MarkType.Starred;
    try {
      await mailApi.updateMailStatus(
        [{ message_id: mail.message_id, mailbox: mail.mailbox }],
        { mark: newMark }
      );
      set((state) => ({
        mails: state.mails.map((m) =>
          m.message_id === mail.message_id ? { ...m, mark: newMark } : m
        ),
      }));
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  },

  deleteMail: async (mail) => {
    const { filter } = get();
    const mark =
      filter === FilterType.Trash ? MarkType.Deleted : MarkType.Trash;
    try {
      await mailApi.updateMailStatus(
        [{ message_id: mail.message_id, mailbox: mail.mailbox }],
        { mark }
      );
      set((state) => ({
        mails: state.mails.filter((m) => m.message_id !== mail.message_id),
        total: state.total - 1,
        selectedMailId:
          state.selectedMailId === mail.message_id
            ? null
            : state.selectedMailId,
        selectedMailDetail:
          state.selectedMailId === mail.message_id
            ? null
            : state.selectedMailDetail,
      }));
      get().fetchStats();
    } catch (err) {
      console.error("Failed to delete mail:", err);
    }
  },

  moveTo: async (mail, mark) => {
    try {
      await mailApi.updateMailStatus(
        [{ message_id: mail.message_id, mailbox: mail.mailbox }],
        { mark }
      );
      // Remove from current list
      set((state) => ({
        mails: state.mails.filter((m) => m.message_id !== mail.message_id),
        total: state.total - 1,
        selectedMailId:
          state.selectedMailId === mail.message_id
            ? null
            : state.selectedMailId,
        selectedMailDetail:
          state.selectedMailId === mail.message_id
            ? null
            : state.selectedMailDetail,
      }));
      get().fetchStats();
    } catch (err) {
      console.error("Failed to move mail:", err);
    }
  },

  // Batch selection actions
  toggleSelect: (messageId) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return { selectedIds: next };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: new Set(state.mails.map((m) => m.message_id)),
    }));
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  batchDelete: async () => {
    const { selectedIds, mails, filter } = get();
    if (selectedIds.size === 0) return;

    const mark = filter === FilterType.Trash ? MarkType.Deleted : MarkType.Trash;
    const targets = mails.filter((m) => selectedIds.has(m.message_id));
    const updates = targets.map((m) => ({
      message_id: m.message_id,
      mailbox: m.mailbox,
    }));

    try {
      await mailApi.updateMailStatus(updates, { mark });
      set((state) => ({
        mails: state.mails.filter((m) => !selectedIds.has(m.message_id)),
        total: Math.max(0, state.total - targets.length),
        selectedIds: new Set(),
        selectedMailId: selectedIds.has(state.selectedMailId || "") ? null : state.selectedMailId,
        selectedMailDetail: selectedIds.has(state.selectedMailId || "") ? null : state.selectedMailDetail,
      }));
      get().fetchStats();
    } catch (err) {
      console.error("Failed to batch delete:", err);
    }
  },

  batchMarkRead: async () => {
    const { selectedIds, mails } = get();
    if (selectedIds.size === 0) return;

    const targets = mails.filter(
      (m) => selectedIds.has(m.message_id) && m.read === ReadStatus.Unread
    );
    if (targets.length === 0) {
      set({ selectedIds: new Set() });
      return;
    }

    const updates = targets.map((m) => ({
      message_id: m.message_id,
      mailbox: m.mailbox,
    }));

    try {
      await mailApi.updateMailStatus(updates, { read: ReadStatus.Read });
      set((state) => ({
        mails: state.mails.map((m) =>
          selectedIds.has(m.message_id) ? { ...m, read: ReadStatus.Read } : m
        ),
        unreadCount: Math.max(0, state.unreadCount - targets.length),
        selectedIds: new Set(),
      }));
    } catch (err) {
      console.error("Failed to batch mark read:", err);
    }
  },

  batchMarkUnread: async () => {
    const { selectedIds, mails } = get();
    if (selectedIds.size === 0) return;

    const targets = mails.filter(
      (m) => selectedIds.has(m.message_id) && m.read === ReadStatus.Read
    );
    if (targets.length === 0) {
      set({ selectedIds: new Set() });
      return;
    }

    const updates = targets.map((m) => ({
      message_id: m.message_id,
      mailbox: m.mailbox,
    }));

    try {
      await mailApi.updateMailStatus(updates, { read: ReadStatus.Unread });
      set((state) => ({
        mails: state.mails.map((m) =>
          selectedIds.has(m.message_id) ? { ...m, read: ReadStatus.Unread } : m
        ),
        unreadCount: state.unreadCount + targets.length,
        selectedIds: new Set(),
      }));
    } catch (err) {
      console.error("Failed to batch mark unread:", err);
    }
  },

  batchStar: async () => {
    const { selectedIds, mails } = get();
    if (selectedIds.size === 0) return;

    const targets = mails.filter(
      (m) => selectedIds.has(m.message_id) && m.mark !== MarkType.Starred
    );
    if (targets.length === 0) {
      set({ selectedIds: new Set() });
      return;
    }

    const updates = targets.map((m) => ({
      message_id: m.message_id,
      mailbox: m.mailbox,
    }));

    try {
      await mailApi.updateMailStatus(updates, { mark: MarkType.Starred });
      set((state) => ({
        mails: state.mails.map((m) =>
          selectedIds.has(m.message_id) ? { ...m, mark: MarkType.Starred } : m
        ),
        selectedIds: new Set(),
      }));
    } catch (err) {
      console.error("Failed to batch star:", err);
    }
  },

  emptyTrash: async () => {
    const { mails } = get();
    if (mails.length === 0) return;

    const updates = mails.map((m) => ({
      message_id: m.message_id,
      mailbox: m.mailbox,
    }));

    try {
      await mailApi.updateMailStatus(updates, { mark: MarkType.Deleted });
      set({
        selectedIds: new Set(),
        selectedMailId: null,
        selectedMailDetail: null,
      });
      get().fetchMails();
      get().fetchStats();
    } catch (err) {
      console.error("Failed to empty trash:", err);
    }
  },
}));
