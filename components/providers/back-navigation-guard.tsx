"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { JUST_AUTHENTICATED_KEY } from "@/lib/constants";

const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/reset-link-expired",
];

function isJustAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const inSession = sessionStorage.getItem(JUST_AUTHENTICATED_KEY) === "true";
  const inCookie = document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${JUST_AUTHENTICATED_KEY}=true`));
  return inSession || inCookie;
}

function clearJustAuthenticated() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(JUST_AUTHENTICATED_KEY);
  document.cookie = `${JUST_AUTHENTICATED_KEY}=; path=/; max-age=0`;
}

export function BackNavigationGuard() {
  const pathname = usePathname();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const initialPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (AUTH_PATHS.some((path) => pathname.startsWith(path))) return;

    if (!isJustAuthenticated()) return;

    if (
      initialPathnameRef.current !== null &&
      initialPathnameRef.current !== pathname
    ) {
      clearJustAuthenticated();
      return;
    }

    initialPathnameRef.current = pathname;

    window.history.pushState({ backGuard: true }, "", window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      window.history.pushState({ backGuard: true }, "", window.location.href);
      setIsDialogOpen(true);
    };

    window.addEventListener("popstate", handlePopState, { capture: true });
    return () => {
      window.removeEventListener("popstate", handlePopState, { capture: true });
    };
  }, [pathname]);

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  const handleConfirm = () => {
    clearJustAuthenticated();
    setIsDialogOpen(false);
    void signOut({ callbackUrl: "/login" });
  };

  return (
    <ConfirmDialog
      isOpen={isDialogOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      title="Sign out?"
      message="You are signed in. If you go back, you will be logged out and returned to the login page."
      confirmText="Log out"
      cancelText="Stay here"
      variant="danger"
    />
  );
}
