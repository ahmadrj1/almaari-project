"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  X,
  Plus,
  Send,
  ChevronDown,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { CHATBOT_NAME } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useCartCount } from "@/hooks/use-cart-count";
import { QuantitySelector } from "@/components/ui/quantity-selector";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  productCards?: ProductCard[];
}

interface ProductCard {
  productId: string;
  title: string;
  description: string | null;
  price: string;
  image: string;
  category: string | null;
  variants: Array<{
    id: string;
    colorName: string;
    colorHex: string;
    sizeName: string;
    stock: number;
    sku: string;
  }>;
}

interface ArchivedSession {
  id: string;
  title: string;
  createdAt: string;
}

interface ChatbotDialogProps {
  onClose: () => void;
}

const USER_SUGGESTED_ACTIONS = [
  "How many orders did I place today?",
  "Show my recent orders",
  "Recommend popular products",
  "Help me place an order",
];

const GUEST_SUGGESTED_ACTIONS = [
  "Recommend popular products",
  "What categories and items do you offer?",
  "Tell me about your best-selling products",
];

function FormattedMessage({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  const parseInline = (text: string): React.ReactNode[] => {
    const tokens = text.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*|`[\s\S]*?`)/g);
    return tokens.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={index} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        return (
          <em key={index} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code
            key={index}
            className={`px-1 py-0.5 rounded font-mono text-xs ${
              isUser ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-800"
            }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const rawLines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown Table Detection
    if (trimmed.startsWith("|") && (trimmed.match(/\|/g) || []).length >= 2) {
      const tableLines: string[] = [];
      while (i < rawLines.length) {
        const cur = rawLines[i].trim();
        if (!cur) {
          let lookahead = i + 1;
          while (lookahead < rawLines.length && !rawLines[lookahead].trim()) {
            lookahead++;
          }
          if (
            lookahead < rawLines.length &&
            rawLines[lookahead].trim().startsWith("|")
          ) {
            i = lookahead;
            continue;
          } else {
            break;
          }
        }
        if (cur.startsWith("|") && (cur.match(/\|/g) || []).length >= 2) {
          tableLines.push(cur);
          i++;
        } else {
          break;
        }
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((c) => c.trim());

        const rawHeader = tableLines[0];
        const headers = parseRow(rawHeader);

        let dataStart = 1;
        const isSep = (rowStr: string) => {
          const cells = parseRow(rowStr);
          return (
            cells.length > 0 &&
            cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s+/g, "")))
          );
        };

        if (tableLines.length > 1 && isSep(tableLines[1])) {
          dataStart = 2;
        }

        const rows = tableLines.slice(dataStart).map(parseRow);

        nodes.push(
          <div
            key={`table-${nodes.length}`}
            className="my-2.5 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs max-w-full"
          >
            <table className="min-w-full text-xs text-left divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-700 font-semibold text-[11px]">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-3 py-2 whitespace-nowrap">
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 text-gray-700 whitespace-nowrap"
                      >
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // Heading Detection
    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h4
          key={`h4-${nodes.length}`}
          className="font-bold text-xs text-gray-900 mt-2 mb-1"
        >
          {parseInline(trimmed.slice(4))}
        </h4>,
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3
          key={`h3-${nodes.length}`}
          className="font-bold text-sm text-gray-900 mt-2.5 mb-1"
        >
          {parseInline(trimmed.slice(3))}
        </h3>,
      );
      i++;
      continue;
    }

    // List item
    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      /^\d+\.\s/.test(trimmed)
    ) {
      const markerMatch = trimmed.match(/^(\d+\.|-|\*)\s+/);
      const marker = markerMatch ? markerMatch[0] : "- ";
      const text = trimmed.slice(marker.length);
      nodes.push(
        <div
          key={`list-${nodes.length}`}
          className="flex items-start gap-1.5 ml-1.5"
        >
          <span
            className={
              isUser
                ? "text-white/80 font-mono text-xs mt-0.5"
                : "text-blue-500 font-bold select-none text-xs mt-0.5"
            }
          >
            {marker.trim().endsWith(".") ? marker.trim() : "•"}
          </span>
          <span className="flex-1 leading-relaxed">{parseInline(text)}</span>
        </div>,
      );
      i++;
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={`p-${nodes.length}`} className="leading-relaxed">
        {parseInline(trimmed)}
      </p>,
    );
    i++;
  }

  return <div className="space-y-1">{nodes}</div>;
}

let nextUserChatMsgId = 0;
function generateClientMessageId(prefix = "msg"): string {
  nextUserChatMsgId += 1;
  return `${prefix}-${nextUserChatMsgId}`;
}

export function ChatbotDialog({ onClose }: ChatbotDialogProps) {
  const { data: _session, status } = useSession();
  const isGuest = status !== "authenticated";
  const { showToast } = useToast();
  const { refresh: refreshCart } = useCartCount();
  const [isClosing, setIsClosing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [viewingArchived, setViewingArchived] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [variantQty, setVariantQty] = useState<Record<string, number>>({});
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Health check on open
  useEffect(() => {
    fetch("/api/chatbot/health")
      .then((r) => r.json())
      .then((d) => setIsOnline(d.online === true))
      .catch(() => setIsOnline(false));

    // Load archived sessions only for authenticated users
    if (status === "authenticated") {
      fetch("/api/chatbot/sessions")
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setSessions(d.data);
        })
        .catch(() => {});
    }
  }, [status]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setViewingArchived(false);
    setInput("");
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
  }, [isClosing]);

  const loadArchivedSession = async (id: string) => {
    setLoadingSession(true);
    setLoadingSessionId(id);
    setShowSessions(false);
    try {
      const res = await fetch(`/api/chatbot/sessions/${id}`);
      const data = await res.json();
      if (data.success) {
        setMessages(
          data.data.messages.map(
            (m: {
              id: string;
              role: "user" | "assistant";
              content: string;
              metadata?: { productCards?: ProductCard[] };
            }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              productCards: m.metadata?.productCards,
            }),
          ),
        );
        setSessionId(id);
        setViewingArchived(false);
      }
    } catch {
      showToast("error", "Failed to load archived chat.");
    } finally {
      setLoadingSession(false);
      setLoadingSessionId(null);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const userText = (textToSend || input).trim();
    if (!userText || loading || viewingArchived) return;
    setInput("");

    const tempId = generateClientMessageId("user");
    const nextMessages: Message[] = [
      ...messages,
      { id: tempId, role: "user", content: userText },
    ];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          sessionId,
          history: isGuest
            ? messages.slice(-6).map((m) => ({
                role: m.role,
                content: m.content,
              }))
            : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to get response");

      if (data.data.isNewSession) {
        setSessionId(data.data.sessionId);
        setSessions((prev) => [
          {
            id: data.data.sessionId,
            title: data.data.sessionTitle,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      if (data.data.cartAction) {
        if (data.data.cartAction.success) {
          refreshCart();
          showToast(
            "success",
            data.data.cartAction.message || "Item added to cart!",
          );
        } else {
          showToast(
            "error",
            data.data.cartAction.message || "Could not add item to cart.",
          );
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: generateClientMessageId("assistant"),
          role: "assistant",
          content: data.data.message,
          productCards: data.data.productCards,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          id: generateClientMessageId("err"),
          role: "assistant",
          content: `Sorry, I ran into an error: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (
    productId: string,
    variantId: string,
    variantLabel: string,
    quantity: number,
  ) => {
    if (isGuest) {
      showToast("info", "Please log in to add items to your cart.");
      return;
    }

    const key = `${productId}-${variantId}`;
    setAddingToCart(key);
    try {
      const res = await fetch("/api/chatbot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      const data = await res.json();
      if (data.success) {
        refreshCart();
        showToast("success", `${variantLabel} added to cart!`);
      } else {
        showToast("error", data.error || "Could not add to cart");
      }
    } catch {
      showToast("error", "Could not add to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div
      onAnimationEnd={(e) => {
        if (isClosing && e.animationName === "chatbot-exit") {
          onClose();
        }
      }}
      className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex flex-col"
      style={{
        width: "min(90vw, 420px)",
        height: "min(80vh, 600px)",
        animation: isClosing
          ? "chatbot-exit 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards"
          : "chatbot-enter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
    >
      <style>{`
        @keyframes chatbot-enter {
          from { opacity: 0; transform: scale(0.8) translateY(20px); transform-origin: bottom right; }
          to   { opacity: 1; transform: scale(1)   translateY(0);    transform-origin: bottom right; }
        }
        @keyframes chatbot-exit {
          from { opacity: 1; transform: scale(1)   translateY(0);    transform-origin: bottom right; }
          to   { opacity: 0; transform: scale(0.8) translateY(20px); transform-origin: bottom right; }
        }
      `}</style>

      <div className="flex flex-col h-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
          <div className="relative h-9 w-9 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
            <Image
              src="/bot.png"
              alt="Bot"
              fill
              sizes="36px"
              className="scale-[1.4] object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm truncate">{CHATBOT_NAME}</p>
              <span
                className={`h-2 w-2 rounded-full flex-shrink-0 ${isOnline ? "bg-green-400 animate-pulse" : "bg-gray-400"}`}
                title={isOnline ? "Online" : "Offline"}
              />
            </div>
            <p className="text-xs text-blue-100">
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>

          {/* Sessions dropdown (Authenticated only) */}
          {status === "authenticated" && (
            <div className="relative">
              <button
                onClick={() => setShowSessions((v) => !v)}
                title="Previous chats"
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <ChevronDown size={16} />
              </button>
              {showSessions && sessions.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white text-gray-800 rounded-xl shadow-xl ring-1 ring-black/10 z-10 overflow-hidden max-h-56 overflow-y-auto">
                  <p className="text-xs text-gray-500 px-3 pt-2 pb-1 font-medium">
                    Previous Chats
                  </p>
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      disabled={loadingSession}
                      onClick={() => loadArchivedSession(s.id)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 disabled:opacity-60 transition-colors text-sm truncate border-t border-gray-50 flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{s.title}</p>
                        <span className="block text-xs text-gray-400">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {loadingSessionId === s.id && (
                        <Loader2
                          size={14}
                          className="animate-spin text-blue-600 ml-2 shrink-0"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New chat */}
          <button
            onClick={startNewChat}
            title="New chat"
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <Plus size={16} />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            title="Close"
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-gray-50/60">
          {loadingSession ? (
            <div className="flex flex-col items-center justify-center h-full gap-2.5 text-gray-500">
              <Loader2 size={26} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium text-gray-500">
                Loading previous chat...
              </p>
            </div>
          ) : (
            <>
              {messages.length === 0 && !viewingArchived && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 p-2">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-blue-50">
                    <Image
                      src="/bot.png"
                      alt="Bot"
                      fill
                      sizes="48px"
                      className="scale-[1.4] object-cover"
                    />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    Hi! How can I help you today?
                  </p>
                  <p className="text-xs text-center text-gray-400 max-w-xs">
                    {isGuest
                      ? "Inquire about our products, pricing, stock, or store details."
                      : "Ask about products, your orders, or choose a suggested action below."}
                  </p>
                  {isGuest && (
                    <span className="inline-block text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200/60 rounded-full px-2.5 py-0.5">
                      Guest Mode • Product inquiries only
                    </span>
                  )}

                  <div className="w-full flex flex-col gap-1.5 mt-2">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">
                      Suggested actions:
                    </p>
                    {(isGuest
                      ? GUEST_SUGGESTED_ACTIONS
                      : USER_SUGGESTED_ACTIONS
                    ).map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-left text-xs bg-white hover:bg-blue-50 hover:text-blue-700 text-gray-700 px-3 py-2 rounded-xl ring-1 ring-black/5 transition-all shadow-xs"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {viewingArchived && (
                <div className="text-center text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  📂 Resumed previous chat.{" "}
                  <button
                    onClick={startNewChat}
                    className="font-medium underline"
                  >
                    Start new chat
                  </button>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id}>
                  <div
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm shadow-sm ring-1 ring-black/5"
                      }`}
                    >
                      <FormattedMessage
                        content={msg.content}
                        isUser={msg.role === "user"}
                      />
                    </div>
                  </div>

                  {/* Product cards */}
                  {msg.productCards && msg.productCards.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2">
                      {msg.productCards.map((card) => (
                        <div
                          key={card.productId}
                          className="bg-white rounded-xl ring-1 ring-black/8 shadow-sm overflow-hidden flex flex-col"
                        >
                          {/* Product image */}
                          <div className="relative h-28 w-full bg-gray-100 flex-shrink-0">
                            <Image
                              src={card.image}
                              alt={card.title}
                              fill
                              sizes="360px"
                              className="object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <p className="font-semibold text-sm text-gray-800 truncate">
                              {card.title}
                            </p>
                            {card.category && (
                              <p className="text-xs text-gray-400">
                                {card.category}
                              </p>
                            )}
                            <p className="text-sm font-bold text-blue-600 mt-0.5">
                              PKR {card.price}
                            </p>
                            {/* Variants */}
                            <div className="mt-2 flex flex-col gap-1.5">
                              {card.variants.slice(0, 3).map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="h-3 w-3 rounded-full border border-black/10 flex-shrink-0"
                                      style={{ backgroundColor: v.colorHex }}
                                    />
                                    <span className="text-xs text-gray-600 truncate">
                                      {v.colorName} / {v.sizeName}
                                    </span>
                                    <span
                                      className={`text-xs flex-shrink-0 ${v.stock > 0 ? "text-green-600" : "text-red-500"}`}
                                    >
                                      {v.stock > 0
                                        ? `(${v.stock} left)`
                                        : "(Out of stock)"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <QuantitySelector
                                      value={variantQty[v.id] ?? 1}
                                      onChange={(qty) =>
                                        setVariantQty((prev) => ({
                                          ...prev,
                                          [v.id]: qty,
                                        }))
                                      }
                                      min={1}
                                      max={v.stock}
                                      disabled={v.stock === 0}
                                    />
                                    <button
                                      disabled={
                                        v.stock === 0 ||
                                        addingToCart ===
                                          `${card.productId}-${v.id}`
                                      }
                                      onClick={() =>
                                        handleAddToCart(
                                          card.productId,
                                          v.id,
                                          `${card.title} (${v.colorName}/${v.sizeName})`,
                                          variantQty[v.id] ?? 1,
                                        )
                                      }
                                      className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded-lg px-2 py-1 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                    >
                                      {addingToCart ===
                                      `${card.productId}-${v.id}` ? (
                                        <Loader2
                                          size={10}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <ShoppingCart size={10} />
                                      )}
                                      Add
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm ring-1 ring-black/5">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <>
            <textarea
              ref={inputRef}
              value={input}
              disabled={loading || loadingSession}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about products, orders…"
              rows={1}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 max-h-28 overflow-y-auto leading-relaxed disabled:bg-gray-50 disabled:text-gray-400"
              style={{ minHeight: "40px" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading || loadingSession}
              className="h-10 w-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </>
        </div>
      </div>
    </div>
  );
}
