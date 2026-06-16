"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type ChatMessage,
  type Conversation,
  listChatMessages,
  listConversations,
  sendChatMessage,
} from "@/lib/api";
import { AppIcon, cx } from "./dashboard-ui";

export function ChatPanel({
  token,
  myUserId,
  initialConvId,
  onClose,
}: {
  token: string;
  myUserId: string;
  initialConvId?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [view, setView] = useState<"list" | "thread">("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listConversations(token).then(setConversations).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (initialConvId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === initialConvId);
      if (conv) openThread(conv);
    }
  }, [initialConvId, conversations]);

  function openThread(conv: Conversation) {
    setActiveConv(conv);
    setMessages([]);
    setView("thread");
    listChatMessages(token, conv.id).then(setMessages).catch(() => {});
  }

  useEffect(() => {
    if (!activeConv) return;
    const url = `/api/v1/chat/conversations/${activeConv.id}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.addEventListener("message", (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as ChatMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => es.close();
  }, [activeConv, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConv || !draft.trim() || sending) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(token, activeConv.id, draft.trim());
      setDraft("");
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } finally {
      setSending(false);
    }
  }

  if (!mounted) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-[1101] flex h-full w-full max-w-sm flex-col bg-[#fffdf8] shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-[#e4ddcf] px-5 py-4">
          {view === "thread" && activeConv ? (
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f0ece4]"
              onClick={() => setView("list")}
            >
              <AppIcon name="arrow" className="h-4 w-4 rotate-180" />
            </button>
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5f1df] text-[#14733a]">
              <AppIcon name="message" className="h-5 w-5" />
            </span>
          )}
          <div className="flex-1">
            <h2 className="font-serif text-lg font-black tracking-tight text-[#061e0e]">
              {view === "thread" && activeConv ? activeConv.otherUser.displayName : "Messages"}
            </h2>
            {view === "thread" && activeConv && (
              <p className="text-xs font-bold capitalize text-[#46534a]">{activeConv.otherUser.role}</p>
            )}
          </div>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full text-[#46534a] hover:bg-[#f0ece4]"
            onClick={onClose}
            aria-label="Close"
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </header>

        {view === "list" ? (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-[#9aab9c]">No conversations yet.</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  className="grid w-full grid-cols-[2.5rem_1fr] items-center gap-3 border-b border-[#f0ece4] px-5 py-4 text-left hover:bg-[#f8f5ef]"
                  onClick={() => openThread(conv)}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f1df] text-sm font-black text-[#14733a]">
                    {conv.otherUser.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="grid gap-0.5">
                    <strong className="block truncate text-sm font-black text-[#101812]">
                      {conv.otherUser.displayName}
                    </strong>
                    <span className="text-xs font-bold capitalize text-[#9aab9c]">{conv.otherUser.role}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="py-6 text-center text-xs font-bold text-[#9aab9c]">No messages yet. Say hello!</p>
              )}
              {messages.map((msg) => {
                const mine = msg.senderId === myUserId;
                return (
                  <div key={msg.id} className={cx("mb-3 flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cx(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-bold",
                        mine
                          ? "rounded-br-sm bg-[#0b5b2b] text-white"
                          : "rounded-bl-sm bg-[#eeeae2] text-[#101812]",
                      )}
                    >
                      <p className="leading-relaxed">{msg.body}</p>
                      <span className={cx("mt-1 block text-right text-[0.6rem]", mine ? "text-white/60" : "text-[#9aab9c]")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form
              onSubmit={handleSend}
              className="flex shrink-0 items-end gap-2 border-t border-[#e4ddcf] px-4 py-3"
            >
              <textarea
                className="flex-1 resize-none rounded-xl border border-[#cfc8ba] bg-[#f9f7f2] px-3 py-2 text-sm font-bold outline-none focus:border-[#0b5b2b]"
                placeholder="Type a message…"
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend(e as unknown as React.FormEvent);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="grid h-9 w-9 place-items-center rounded-xl bg-[#0b5b2b] text-white disabled:opacity-40"
              >
                <AppIcon name="arrow" className="h-4 w-4 -rotate-90" />
              </button>
            </form>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
