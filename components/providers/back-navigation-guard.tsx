"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { JUST_AUTHENTICATED_KEY } from "@/lib/constants";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/reset-link-expired"];

export function BackNavigationGuard() {
  const pathname = usePathname();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogOpenRef = useRef(false);
  const landingPathnameRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (AUTH_PATHS.some((path) => pathname.startsWith(path))) return;

    const justAuthenticated = sessionStorage.getItem(JUST_AUTHENTICATED_KEY) === "true";

    // If user has navigated past the first post-auth page, clear flag and do nothing.
    if (landingPathnameRef.current !== null && landingPathnameRef.current !== pathname) {
      sessionStorage.removeItem(JUST_AUTHENTICATED_KEY);
      return;
    }

    if (!justAuthenticated) return;

    // First post-auth page — record it and activate guard.
    landingPathnameRef.current = pathname;

    const guardState = { backGuard: true, path: pathname };
    window.history.pushState(guardState, "", window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      if (dialogOpenRef.current) return;
      window.history.pushState(guardState, "", window.location.href);
      dialogOpenRef.current = true;
      setIsDialogOpen(true);
    };

    window.addEventListener("popstate", handlePopState, { capture: true });
    return () => {
      window.removeEventListener("popstate", handlePopState, { capture: true });
    };
  }, [pathname]);


  const handleCancel = () => {
    dialogOpenRef.current = false;
    window.history.pushState({ backGuard: true, path: pathname }, "", window.location.href);
    setIsDialogOpen(false);
  };

  const handleConfirm = () => {
    sessionStorage.removeItem(JUST_AUTHENTICATED_KEY);
    dialogOpenRef.current = false;
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
