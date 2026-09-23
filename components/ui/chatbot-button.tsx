"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChatbotDialog } from "@/components/chatbot/ChatbotDialog";

const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/reset-link-expired",
];

export function ChatbotButton() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Hide on auth pages
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return null;

  // Hide while loading or for admins
  if (
    status === "loading" ||
    (status === "authenticated" &&
      session?.user?.role?.toUpperCase() === "ADMIN")
  ) {
    return null;
  }

  const handleClick = () => {
    if (status !== "authenticated") {
      showToast("info", "Please login to chat with the assistant.");
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      {/* Floating button — hidden when dialog is open */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center group sm:bottom-8 sm:right-8">
          {/* Tooltip */}
          <div
            role="tooltip"
            className="pointer-events-none invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-sm"
          >
            Click to chat with our AI
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900/90" />
          </div>

          <button
            type="button"
            onClick={handleClick}
            aria-label="Open Chatbot"
            title="Click to chat with our AI"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:h-16 sm:w-16 animate-in fade-in zoom-in-75 duration-200"
          >
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <Image
                src="/bot.png"
                alt="Chatbot"
                fill
                sizes="(max-width: 640px) 56px, 64px"
                className="scale-[1.45] object-cover"
                priority
              />
            </div>
          </button>
        </div>
      )}

      {/* Dialog — replaces button when open */}
      {isOpen && <ChatbotDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}
