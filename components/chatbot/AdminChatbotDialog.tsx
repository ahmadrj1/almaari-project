"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { X, Plus, Send, Loader2, Sparkles, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ArchivedSession {
  id: string;
  title: string;
  createdAt: string;
}

interface AdminChatbotDialogProps {
  onClose: () => void;
}

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
              isUser ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-800"
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
            className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs max-w-full"
          >
            <table className="min-w-full text-xs text-left divide-y divide-slate-200">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold text-[11px]">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-3 py-2 whitespace-nowrap">
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 text-slate-700 whitespace-nowrap"
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
          className="font-bold text-xs text-slate-900 mt-2 mb-1"
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
          className="font-bold text-sm text-slate-900 mt-2.5 mb-1"
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
          <span className="text-slate-400 mt-0.5 select-none text-xs font-mono">
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

const QUICK_PROMPTS = [
  "Order status breakdown",
  "Total revenue and COD orders",
  "Which products are low on stock?",
  "Top customers by order count",
  "Which products have zero sales?",
];

let nextMessageId = 0;
function generateClientMessageId(prefix = "msg"): string {
  nextMessageId += 1;
  return `${prefix}-${nextMessageId}`;
}

export function AdminChatbotDialog({ onClose }: AdminChatbotDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/admin/chatbot/health")
      .then((r) => r.json())
      .then((d) => setIsOnline(d.online === true))
      .catch(() => setIsOnline(false));

    fetch("/api/admin/chatbot/sessions")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSessions(d.data);
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
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
      const res = await fetch(`/api/admin/chatbot/sessions/${id}`);
      const data = await res.json();
      if (data.success) {
        setMessages(
          data.data.messages.map(
            (m: {
              id: string;
              role: "user" | "assistant";
              content: string;
            }) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            }),
          ),
        );
        setSessionId(id);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSession(false);
      setLoadingSessionId(null);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || loading || loadingSession) return;
    setInput("");

    const tempId = generateClientMessageId("user");
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: messageContent },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageContent, sessionId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to get response");

      if (data.data?.isNewSession) {
        setSessionId(data.data.sessionId);
        setSessions((prev) => [
          {
            id: data.data.sessionId,
            title:
              data.data.sessionTitle ||
              `Admin Query: ${messageContent.slice(0, 25)}`,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: generateClientMessageId("assistant"),
          role: "assistant",
          content: data.data.message,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          id: generateClientMessageId("err"),
          role: "assistant",
          content: `Error: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onAnimationEnd={(e) => {
        if (isClosing && e.animationName === "admin-chatbot-exit") {
          onClose();
        }
      }}
      className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex flex-col"
      style={{
        width: "min(92vw, 460px)",
        height: "min(82vh, 640px)",
        animation: isClosing
          ? "admin-chatbot-exit 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards"
          : "admin-chatbot-enter 0.24s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
    >
      <style>{`
        @keyframes admin-chatbot-enter {
          from { opacity: 0; transform: scale(0.85) translateY(20px); transform-origin: bottom right; }
          to   { opacity: 1; transform: scale(1) translateY(0); transform-origin: bottom right; }
        }
        @keyframes admin-chatbot-exit {
          from { opacity: 1; transform: scale(1) translateY(0); transform-origin: bottom right; }
          to   { opacity: 0; transform: scale(0.85) translateY(20px); transform-origin: bottom right; }
        }
      `}</style>

      <div className="flex flex-col h-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex-shrink-0">
          <div className="relative h-9 w-9 rounded-full overflow-hidden flex-shrink-0 bg-white/10 ring-1 ring-white/20">
            <Image
              src="/bot.png"
              alt="Admin Bot"
              fill
              sizes="36px"
              className="scale-[1.4] object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">Admin Assistant</p>
              <span
                className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-400"
                }`}
                title={isOnline ? "Online" : "Offline"}
              />
            </div>
            <p className="text-[11px] text-slate-300">
              Operations &amp; Analytics AI
            </p>
          </div>

          {/* Sessions dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSessions((v) => !v)}
              title="Previous admin sessions"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronDown size={16} />
            </button>
            {showSessions && sessions.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-slate-900 text-white rounded-xl shadow-2xl ring-1 ring-white/10 z-20 overflow-hidden max-h-60 overflow-y-auto border border-slate-800">
                <p className="text-[11px] text-slate-400 px-3 pt-2 pb-1 font-semibold uppercase tracking-wider">
                  Past Admin Sessions
                </p>
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    disabled={loadingSession}
                    onClick={() => loadArchivedSession(s.id)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800/80 disabled:opacity-60 transition-colors text-xs truncate border-t border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-200">
                        {s.title}
                      </p>
                      <span className="block text-[10px] text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {loadingSessionId === s.id && (
                      <Loader2
                        size={12}
                        className="animate-spin text-indigo-400 ml-2 shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startNewChat}
            title="New session"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={handleClose}
            title="Close"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-slate-50/60">
          {loadingSession ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <p className="text-xs font-medium text-slate-500">
                Loading session...
              </p>
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-4">
                  <div className="relative h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 ring-1 ring-indigo-200">
                    <Sparkles size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Welcome to Admin Assistant
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ask queries about order status, revenue, customer order
                      counts, and inventory.
                    </p>
                  </div>

                  {/* Quick suggestions */}
                  <div className="w-full flex flex-col gap-1.5 mt-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Suggested queries:
                    </p>
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left text-xs bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-3 py-2 rounded-xl ring-1 ring-black/5 transition-all shadow-xs"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white text-slate-800 rounded-bl-sm shadow-sm ring-1 ring-black/5"
                    }`}
                  >
                    <FormattedMessage
                      content={msg.content}
                      isUser={msg.role === "user"}
                    />
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm ring-1 ring-black/5 flex items-center gap-2 text-slate-500 text-xs">
                    <Loader2
                      size={13}
                      className="animate-spin text-indigo-600"
                    />
                    <span>Analyzing store data...</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-slate-100 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask an admin or inventory query..."
              disabled={loading || loadingSession}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-24 py-1 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || loadingSession}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
