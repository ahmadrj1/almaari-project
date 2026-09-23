"use client";

import { useState } from "react";
import Image from "next/image";
import { AdminChatbotDialog } from "@/components/chatbot/AdminChatbotDialog";

export function AdminChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center group sm:bottom-8 sm:right-8">
          <div
            role="tooltip"
            className="pointer-events-none invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-sm"
          >
            Admin AI Assistant
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/90" />
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open Admin Chatbot"
            title="Open Admin AI Assistant"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:h-16 sm:w-16 animate-in fade-in zoom-in-75 duration-200"
          >
            <div className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-indigo-500/20">
              <Image
                src="/bot.png"
                alt="Admin Chatbot"
                fill
                sizes="(max-width: 640px) 56px, 64px"
                className="scale-[1.45] object-cover"
                priority
              />
            </div>
          </button>
        </div>
      )}

      {isOpen && <AdminChatbotDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
