import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCheck, Paperclip, Search, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { formatNepalDate } from '../lib/nepal-locations';
import type { AppNotification, ChatMessage, Conversation } from '../types';
import { EmptyState, LoadingSkeleton } from '../components/ui/CommonUI';
import { VerificationBadge } from '../components/ui/Badges';

export const MessagesPage: React.FC = () => {
  const { user, lang, navigate, showToast, refreshUnreadCounts } = useApp();
  const initialConv = new URLSearchParams(window.location.search).get('conv');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConv);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [messageText, setMessageText] = useState('');
  const [attachmentRef, setAttachmentRef] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [loading, setLoading] = useState(true);

  const dashPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employer' ? '/employer' : '/seeker';

  const loadConversations = async () => {
    try {
      const res = await apiFetch<{ conversations: Conversation[] }>('/api/conversations');
      setConversations(res.conversations);
      if (!selectedId && res.conversations.length > 0) {
        setSelectedId(res.conversations[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load conversations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    const res = await apiFetch<{ messages: ChatMessage[] }>(`/api/conversations/${convId}/messages`);
    setMessages(res.messages);
    refreshUnreadCounts();
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !messageText.trim()) return;
    try {
      await apiFetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          messageText: messageText.trim(),
          attachmentReference: attachmentRef.trim() || null,
        }),
      });
      setMessageText('');
      setAttachmentRef('');
      setShowAttach(false);
      await loadMessages(selectedId);
      await loadConversations();
    } catch (err: any) {
      showToast(err.message || 'Could not send message.', 'error');
    }
  };

  const filtered = conversations.filter(
    (c) =>
      c.otherUserName.toLowerCase().includes(searchQ.toLowerCase()) ||
      (c.contextTitle || '').toLowerCase().includes(searchQ.toLowerCase()),
  );

  const activeConv = conversations.find((c) => c.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC] flex flex-col">
      <header className="h-14 border-b border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111B2E] px-4 sm:px-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(dashPath)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <h1 className="text-base font-bold">KaamSetu Messages</h1>
        <span className="text-xs text-slate-500 dark:text-[#94A3B8]">{user?.fullName}</span>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
            {/* Conversations List */}
            <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#263449] flex flex-col">
              <div className="p-3 border-b border-slate-200 dark:border-[#263449]">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-[#263449]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#263449]">
                {filtered.length === 0 ? (
                  <p className="p-6 text-xs text-center text-slate-500 dark:text-[#94A3B8]">
                    No conversations yet. Message an employer or candidate from any listing.
                  </p>
                ) : (
                  filtered.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full p-4 text-left transition-colors ${
                        selectedId === conv.id
                          ? 'bg-[#16C784]/10'
                          : 'hover:bg-slate-50 dark:hover:bg-[#111B2E]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate">{conv.otherUserName}</span>
                        {conv.unreadCount > 0 && (
                          <span className="text-xs font-mono-num font-bold text-[#16C784]">{conv.unreadCount}</span>
                        )}
                      </div>
                      {conv.contextTitle && (
                        <p className="text-[11px] text-[#3B82F6] truncate mt-0.5">{conv.contextTitle}</p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-1">
                        {conv.lastMessage || 'Start conversation'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </aside>

            {/* Chat Thread */}
            <section className="md:col-span-8 flex flex-col">
              {!activeConv ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <EmptyState
                    title="Select a conversation"
                    description="Choose a conversation from the list or contact an employer from any job listing."
                  />
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-slate-200 dark:border-[#263449] flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold">{activeConv.otherUserName}</h2>
                        <VerificationBadge status={activeConv.otherUserVerified} />
                      </div>
                      {activeConv.contextTitle && (
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{activeConv.contextTitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 capitalize">
                      {activeConv.otherUserRole.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px]">
                    {messages.map((m) => {
                      const mine = m.senderId === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm space-y-1 ${
                              mine
                                ? 'bg-[#16C784] text-[#0B1220]'
                                : 'bg-slate-100 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449]'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.messageText}</p>
                            {m.attachmentReference && (
                              <p className="text-xs underline opacity-85">Attachment: {m.attachmentReference}</p>
                            )}
                            <div className="flex items-center justify-end gap-1 text-[10px] opacity-75">
                              <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {mine && m.readAt && <CheckCheck className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-[#263449] space-y-2">
                    {showAttach && (
                      <input
                        type="text"
                        value={attachmentRef}
                        onChange={(e) => setAttachmentRef(e.target.value)}
                        placeholder="Optional link or document reference (e.g. Portfolio PDF URL)..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAttach((v) => !v)}
                        aria-label="Attach link or reference"
                        className="p-2.5 rounded-xl border border-slate-300 dark:border-[#263449] text-slate-500 hover:text-[#16C784]"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Write a message..."
                        className="flex-1 px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                      />
                      <button
                        type="submit"
                        aria-label="Send message"
                        className="px-4 py-2.5 rounded-xl bg-[#16C784] text-[#0B1220] font-semibold text-sm inline-flex items-center gap-1.5"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export const NotificationsPage: React.FC = () => {
  const { user, lang, navigate, showToast, refreshUnreadCounts } = useApp();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const dashPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employer' ? '/employer' : '/seeker';

  const load = async () => {
    try {
      const res = await apiFetch<{ notifications: AppNotification[] }>('/api/notifications');
      setNotifications(res.notifications);
    } catch (err: any) {
      showToast(err.message || 'Could not load notifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    refreshUnreadCounts();
    showToast('All notifications marked read.', 'info');
  };

  const markRead = async (id: string) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    refreshUnreadCounts();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC]">
      <header className="h-14 border-b border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111B2E] px-4 sm:px-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(dashPath)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <h1 className="text-base font-bold">Notifications</h1>
        <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[#16C784] hover:underline">
          Mark all read
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
          In-app notifications are active. Push &amp; SMS gateway hooks are ready for provider credentials.
        </p>
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : notifications.length === 0 ? (
          <EmptyState title="No notifications yet" description="Application updates, verification decisions, and match alerts appear here." />
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                  n.isRead
                    ? 'bg-white dark:bg-[#172338] border-slate-200 dark:border-[#263449]'
                    : 'bg-[#16C784]/5 border-[#16C784]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{n.title}</h2>
                  {!n.isRead && <span className="text-[11px] font-semibold text-[#16C784]">Unread</span>}
                </div>
                <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">{n.message}</p>
                <p className="text-[11px] text-slate-400 mt-1.5">{formatNepalDate(n.createdAt, lang)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
