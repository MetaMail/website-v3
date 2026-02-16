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

// ── Identity helpers ──
// A mail is uniquely identified by (message_id, mailbox).
// The same message_id can appear in both Inbox (0) and Sent (1).

function mailKey(m: { message_id: string; mailbox: MailBoxType }): string {
  return `${m.message_id}:${m.mailbox}`;
}

function sameMail(
  a: { message_id: string; mailbox: MailBoxType },
  b: { message_id: string; mailbox: MailBoxType }
): boolean {
  return a.message_id === b.message_id && a.mailbox === b.mailbox;
}

// ── LRU cache for mail detail CONTENT (body, attachments — not status) ──

class LruCache<T> {
  private map = new Map<string, T>();
  constructor(private maxSize: number) {}

  get(key: string): T | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value!;
      this.map.delete(oldest);
    }
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}

// Stores mail body/content only. Status (mark/read) always comes from mails list.
const detailCache = new LruCache<MailDetail>(50);

// Counter to detect stale fetch responses (e.g. rapid page clicks)
let fetchSeq = 0;

// ── Types ──

interface CachedPage {
  mails: MailItem[];
  pageCount: number;
  total: number;
}

interface MailState {
  filter: FilterType;
  pageIndex: number;
  pageCount: number;
  total: number;
  searchQuery: string;

  mails: MailItem[];
  loading: boolean;
  mailCache: Record<string, CachedPage>;

  unreadCount: number;
  spamCount: number;
  draftCount: number;

  selectedMailId: string | null;
  selectedMailDetail: MailDetail | null;
  detailLoading: boolean;

  selectedIds: Set<string>;

  setFilter: (filter: FilterType) => void;
  setPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  fetchMails: () => Promise<void>;
  fetchStats: () => Promise<void>;
  selectMail: (messageId: string | null, mailbox?: MailBoxType) => Promise<void>;
  markAsRead: (mail: MailItem) => Promise<void>;
  markAsUnread: (mail: MailItem) => Promise<void>;
  toggleStar: (mail: MailItem) => Promise<void>;
  moveTo: (mail: MailItem, mark: MarkType) => Promise<void>;
  deleteMail: (mail: MailItem) => Promise<void>;

  toggleSelect: (messageId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  batchDelete: () => Promise<void>;
  batchMarkRead: () => Promise<void>;
  batchMarkUnread: () => Promise<void>;
  batchStar: () => Promise<void>;
  batchMoveToInbox: () => Promise<void>;
  emptyTrash: () => Promise<void>;
}

export const useMailStore = create<MailState>((set, get) => ({
  filter: FilterType.Inbox,
  pageIndex: 1,
  pageCount: 0,
  total: 0,
  mails: [],
  loading: false,
  mailCache: {},
  unreadCount: 0,
  spamCount: 0,
  draftCount: 0,
  selectedMailId: null,
  selectedMailDetail: null,
  detailLoading: false,
  selectedIds: new Set<string>(),
  searchQuery: "",

  setFilter: (filter) => {
    const cacheKey = `${filter}:1`;
    const cached = get().mailCache[cacheKey];
    set({
      filter,
      pageIndex: 1,
      searchQuery: "",
      selectedMailId: null,
      selectedMailDetail: null,
      selectedIds: new Set(),
      ...(cached ? { mails: cached.mails, pageCount: cached.pageCount, total: cached.total } : {}),
    });
    get().fetchMails();
  },

  setSearchQuery: (query) => {
    const cacheKey = query
      ? `search:${query}:${get().filter}:1`
      : `${get().filter}:1`;
    const cached = get().mailCache[cacheKey];
    set({
      searchQuery: query,
      pageIndex: 1,
      selectedMailId: null,
      selectedMailDetail: null,
      selectedIds: new Set(),
      ...(cached ? { mails: cached.mails, pageCount: cached.pageCount, total: cached.total } : {}),
    });
    get().fetchMails();
  },

  clearSearch: () => {
    const cacheKey = `${get().filter}:1`;
    const cached = get().mailCache[cacheKey];
    set({
      searchQuery: "",
      pageIndex: 1,
      selectedMailId: null,
      selectedMailDetail: null,
      selectedIds: new Set(),
      ...(cached ? { mails: cached.mails, pageCount: cached.pageCount, total: cached.total } : {}),
    });
    get().fetchMails();
  },

  setPage: (page) => {
    const { filter, searchQuery } = get();
    const cacheKey = searchQuery
      ? `search:${searchQuery}:${filter}:${page}`
      : `${filter}:${page}`;
    const cached = get().mailCache[cacheKey];
    set({
      pageIndex: page,
      selectedIds: new Set(),
      ...(cached ? { mails: cached.mails, pageCount: cached.pageCount, total: cached.total } : {}),
    });
    get().fetchMails();
  },

  fetchMails: async () => {
    const { filter, pageIndex, searchQuery, mailCache } = get();
    const cacheKey = searchQuery
      ? `search:${searchQuery}:${filter}:${pageIndex}`
      : `${filter}:${pageIndex}`;
    const hasCached = !!mailCache[cacheKey];

    if (!hasCached) {
      set({ loading: true });
    }

    const seq = ++fetchSeq;

    try {
      const res = searchQuery
        ? await mailApi.searchMails(searchQuery, filter, pageIndex)
        : await mailApi.getMailList(filter, pageIndex);

      if (seq !== fetchSeq) return;

      const page: CachedPage = {
        mails: res.mails || [],
        pageCount: res.page_num,
        total: res.total,
      };

      set((state) => {
        // Sync selectedMailDetail status with fresh list data
        let selectedMailDetail = state.selectedMailDetail;
        if (selectedMailDetail) {
          const freshItem = page.mails.find((m) => sameMail(m, selectedMailDetail!));
          if (freshItem) {
            selectedMailDetail = { ...selectedMailDetail, mark: freshItem.mark, read: freshItem.read };
          }
        }
        return {
          mails: page.mails,
          pageCount: page.pageCount,
          total: page.total,
          selectedIds: new Set(),
          loading: false,
          mailCache: { ...state.mailCache, [cacheKey]: page },
          selectedMailDetail,
        };
      });
    } catch (err) {
      if (seq !== fetchSeq) return;
      console.error("Failed to fetch mails:", err);
      if (!hasCached) {
        set({ mails: [], loading: false });
      } else {
        set({ loading: false });
      }
    }
  },

  fetchStats: async () => {
    try {
      const stats = await mailApi.getMailStat();
      set({ unreadCount: stats.unread, spamCount: stats.spam, draftCount: stats.draft });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  },

  selectMail: async (messageId, mailbox) => {
    if (!messageId) {
      set({ selectedMailId: null, selectedMailDetail: null });
      return;
    }

    // Find the list item — use mailbox for precise match
    const mail = mailbox !== undefined
      ? get().mails.find((m) => m.message_id === messageId && m.mailbox === mailbox)
      : get().mails.find((m) => m.message_id === messageId);

    if (mail && mail.mailbox === MailBoxType.Draft) {
      set({ detailLoading: true });
      try {
        const results = await mailApi.batchGetMails([messageId], mail?.mailbox);
        const detail = results?.[0];
        if (!detail) throw new Error("Draft not found");
        const { useComposeStore } = await import("./compose");
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

    // Check content cache — always merge status from list item
    const key = mail ? mailKey(mail) : messageId;
    const cached = detailCache.get(key);
    if (cached) {
      const detail = mail
        ? { ...cached, mark: mail.mark, read: mail.read }
        : cached;
      set({ selectedMailId: messageId, selectedMailDetail: detail, detailLoading: false });
      if (mail && mail.read === ReadStatus.Unread) {
        get().markAsRead(mail);
      }
      return;
    }

    // Show list data immediately while body loads
    set({
      selectedMailId: messageId,
      selectedMailDetail: mail ? (mail as MailDetail) : null,
      detailLoading: true,
    });
    try {
      const results = await mailApi.batchGetMails([messageId], mail?.mailbox);
      const detail = results?.[0];
      if (!detail) throw new Error("Mail not found");

      // Store content in cache
      detailCache.set(key, detail);
      // Merge status from list item (source of truth)
      const merged = mail
        ? { ...detail, mark: mail.mark, read: mail.read }
        : detail;
      set({ selectedMailDetail: merged, detailLoading: false });

      if (mail && mail.read === ReadStatus.Unread) {
        get().markAsRead(mail);
      }
    } catch (err) {
      console.error("Failed to fetch mail detail:", err);
      set({ detailLoading: false });
    }
  },

  // ── Status mutations: update mails + mailCache + selectedMailDetail ──
  // detailCache is never touched — it only stores content.

  markAsRead: async (mail) => {
    try {
      await mailApi.updateMailStatus(
        [{ message_id: mail.message_id, mailbox: mail.mailbox }],
        { read: ReadStatus.Read }
      );
      set((state) => ({
        mails: state.mails.map((m) =>
          sameMail(m, mail) ? { ...m, read: ReadStatus.Read } : m
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        selectedMailDetail:
          state.selectedMailDetail && sameMail(state.selectedMailDetail, mail)
            ? { ...state.selectedMailDetail, read: ReadStatus.Read }
            : state.selectedMailDetail,
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
          sameMail(m, mail) ? { ...m, read: ReadStatus.Unread } : m
        ),
        unreadCount: state.unreadCount + 1,
        selectedMailDetail:
          state.selectedMailDetail && sameMail(state.selectedMailDetail, mail)
            ? { ...state.selectedMailDetail, read: ReadStatus.Unread }
            : state.selectedMailDetail,
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
      set((state) => {
        // Update mailCache so page/filter switches stay consistent
        const updatedMailCache: Record<string, CachedPage> = {};
        for (const [cacheKey, page] of Object.entries(state.mailCache)) {
          if (page.mails.some((m) => sameMail(m, mail))) {
            updatedMailCache[cacheKey] = {
              ...page,
              mails: page.mails.map((m) =>
                sameMail(m, mail) ? { ...m, mark: newMark } : m
              ),
            };
          } else {
            updatedMailCache[cacheKey] = page;
          }
        }
        return {
          mails: state.mails.map((m) =>
            sameMail(m, mail) ? { ...m, mark: newMark } : m
          ),
          selectedMailDetail:
            state.selectedMailDetail && sameMail(state.selectedMailDetail, mail)
              ? { ...state.selectedMailDetail, mark: newMark }
              : state.selectedMailDetail,
          mailCache: updatedMailCache,
        };
      });
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
      detailCache.delete(mailKey(mail));
      set((state) => ({
        mails: state.mails.filter((m) => !sameMail(m, mail)),
        total: state.total - 1,
        selectedMailId:
          state.selectedMailDetail && sameMail(state.selectedMailDetail, mail)
            ? null
            : state.selectedMailId,
        selectedMailDetail:
          state.selectedMailDetail && sameMail(state.selectedMailDetail, mail)
            ? null
            : state.selectedMailDetail,
        mailCache: {},
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
      detailCache.delete(mailKey(mail));
      set((state) => ({
        mails: state.mails.filter((m) => !sameMail(m, mail)),
        total: state.total - 1,
        selectedMailId:
          state.selectedMailDetail && sameMail(state.selectedMailDetail, mail)
            ? null
            : state.selectedMailId,
        selectedMailDetail:
          state.selectedMailDetail && sameMail(state.selectedMailDetail, mail)
            ? null
            : state.selectedMailDetail,
        mailCache: {},
      }));
      get().fetchStats();
    } catch (err) {
      console.error("Failed to move mail:", err);
    }
  },

  // ── Batch selection ──

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
      targets.forEach((m) => detailCache.delete(mailKey(m)));
      set((state) => ({
        mails: state.mails.filter((m) => !selectedIds.has(m.message_id)),
        total: Math.max(0, state.total - targets.length),
        selectedIds: new Set(),
        selectedMailId: selectedIds.has(state.selectedMailId || "") ? null : state.selectedMailId,
        selectedMailDetail: selectedIds.has(state.selectedMailId || "") ? null : state.selectedMailDetail,
        mailCache: {},
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

  batchMoveToInbox: async () => {
    const { selectedIds, mails } = get();
    if (selectedIds.size === 0) return;

    const targets = mails.filter((m) => selectedIds.has(m.message_id));
    const updates = targets.map((m) => ({
      message_id: m.message_id,
      mailbox: m.mailbox,
    }));

    try {
      await mailApi.updateMailStatus(updates, { mark: MarkType.Normal });
      targets.forEach((m) => detailCache.delete(mailKey(m)));
      set((state) => ({
        mails: state.mails.filter((m) => !selectedIds.has(m.message_id)),
        total: Math.max(0, state.total - targets.length),
        selectedIds: new Set(),
        selectedMailId: selectedIds.has(state.selectedMailId || "") ? null : state.selectedMailId,
        selectedMailDetail: selectedIds.has(state.selectedMailId || "") ? null : state.selectedMailDetail,
        mailCache: {},
      }));
      get().fetchStats();
    } catch (err) {
      console.error("Failed to batch move to inbox:", err);
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
      mails.forEach((m) => detailCache.delete(mailKey(m)));
      set({
        selectedIds: new Set(),
        selectedMailId: null,
        selectedMailDetail: null,
        mailCache: {},
      });
      get().fetchMails();
      get().fetchStats();
    } catch (err) {
      console.error("Failed to empty trash:", err);
    }
  },
}));
