"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  type ChatMessage,
  type Conversation,
  chatEventsUrl,
  getOrCreateConversation,
  listChatMessages,
  listConversations,
  sendChatMessage,
} from "@/lib/api";
import { AppIcon, cx, ghostButton, primaryButton } from "./ui";

export function ChatPanel({
  token,
  currentUserId,
  initialOtherUserId,
}: {
  token: string;
  currentUserId: string;
  initialOtherUserId?: string | null;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setIsLoading(true);
      try {
        const items = await listConversations(token);
        if (!alive) return;
        setConversations(items);
        setActiveConversation((current) => current ?? items[0] ?? null);
        setError("");
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Could not load chat.");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!initialOtherUserId || initialOtherUserId === lastTargetRef.current) {
      return;
    }
    const targetUserId = initialOtherUserId;
    lastTargetRef.current = targetUserId;
    let alive = true;
    async function openTarget() {
      try {
        const conv = await getOrCreateConversation(token, targetUserId);
        if (!alive) return;
        setConversations((items) => [
          conv,
          ...items.filter((item) => item.id !== conv.id),
        ]);
        setActiveConversation(conv);
        setError("");
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Could not open chat.");
      }
    }
    void openTarget();
    return () => {
      alive = false;
    };
  }, [initialOtherUserId, token]);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }
    const conversation = activeConversation;
    let alive = true;
    async function loadMessages() {
      try {
        const items = await listChatMessages(token, conversation.id);
        if (!alive) return;
        setMessages(items);
        setError("");
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof Error ? err.message : "Could not load messages.",
        );
      }
    }
    void loadMessages();

    const source = new EventSource(chatEventsUrl(conversation.id, token));
    source.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data) as ChatMessage;
      setMessages((items) =>
        items.some((item) => item.id === msg.id) ? items : [...items, msg],
      );
    });
    source.onerror = () => source.close();
    return () => {
      alive = false;
      source.close();
    };
  }, [activeConversation, token]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!activeConversation || !body) return;
    setDraft("");
    try {
      const msg = await sendChatMessage(token, activeConversation.id, body);
      setMessages((items) =>
        items.some((item) => item.id === msg.id) ? items : [...items, msg],
      );
      setConversations((items) => [
        activeConversation,
        ...items.filter((item) => item.id !== activeConversation.id),
      ]);
      setError("");
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : "Message failed.");
    }
  }

  return (
    <div className="flex h-full min-h-[32rem] flex-col gap-4">
      {error ? (
        <p className="rounded-md border border-[#f0a59b] bg-[#fff0eb] px-3 py-2 text-xs font-black text-[#80251d]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#6a735f]">
          Conversations
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {isLoading ? (
            <span className="text-sm font-bold text-[#46534a]">Loading...</span>
          ) : null}
          {!isLoading && conversations.length === 0 ? (
            <span className="rounded-lg border border-dashed border-[#d8cfba] px-3 py-2 text-xs font-bold text-[#46534a]">
              No chats yet. Use Chat in-app from proposal or pickup cards.
            </span>
          ) : null}
          {conversations.map((conv) => (
            <button
              className={cx(
                "shrink-0 rounded-full border px-3 py-2 text-xs font-black transition",
                activeConversation?.id === conv.id
                  ? "border-[#14733a] bg-[#e5f1df] text-[#073515]"
                  : "border-[#ded7c9] bg-white text-[#46534a] hover:border-[#14733a]",
              )}
              key={conv.id}
              onClick={() => setActiveConversation(conv)}
              type="button"
            >
              {conv.otherUser.displayName}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#ded7c9] bg-[#f8f6ef]">
        {activeConversation ? (
          <>
            <header className="flex items-center gap-3 border-b border-[#ded7c9] bg-[#fffdf8] p-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5f1df] text-[#14733a]">
                <AppIcon name="message" className="h-4 w-4" />
              </span>
              <div>
                <strong className="block text-sm font-black text-[#101812]">
                  {activeConversation.otherUser.displayName}
                </strong>
                <span className="text-xs font-bold capitalize text-[#46534a]">
                  {activeConversation.otherUser.role}
                </span>
              </div>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <p className="rounded-lg bg-white p-3 text-sm font-bold text-[#46534a]">
                  Start conversation with delivery context.
                </p>
              ) : null}
              {messages.map((msg) => {
                const mine = msg.senderId === currentUserId;
                return (
                  <div
                    className={cx(
                      "flex",
                      mine ? "justify-end" : "justify-start",
                    )}
                    key={msg.id}
                  >
                    <p
                      className={cx(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm font-bold leading-5",
                        mine
                          ? "bg-[#14733a] text-white"
                          : "border border-[#ded7c9] bg-white text-[#101812]",
                      )}
                    >
                      {msg.body}
                    </p>
                  </div>
                );
              })}
            </div>
            <form
              className="grid grid-cols-[1fr_auto] gap-2 border-t border-[#ded7c9] bg-[#fffdf8] p-3"
              onSubmit={sendMessage}
            >
              <label className="sr-only" htmlFor="chat-message">
                Message
              </label>
              <input
                className="min-h-11 rounded-md border border-[#d7d0c2] bg-white px-3 text-sm font-bold outline-none focus:border-[#14733a]"
                id="chat-message"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type message..."
                value={draft}
              />
              <button className={primaryButton} type="submit">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div>
              <AppIcon
                name="message"
                className="mx-auto mb-3 h-8 w-8 text-[#14733a]"
              />
              <p className="text-sm font-bold text-[#46534a]">
                Select conversation or open chat from proposal card.
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        className={ghostButton}
        type="button"
        onClick={async () => {
          const items = await listConversations(token);
          setConversations(items);
          setActiveConversation((current) => current ?? items[0] ?? null);
        }}
      >
        Refresh conversations
      </button>
    </div>
  );
}
