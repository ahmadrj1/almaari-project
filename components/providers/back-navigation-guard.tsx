"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/reset-link-expired"];

export function BackNavigationGuard() {
  const { status } = useSession();
  const pathname = usePathname();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogOpenRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (AUTH_PATHS.some((path) => pathname.startsWith(path))) return;

    const nextGuardState = { backGuard: true, path: pathname };
    window.history.pushState(nextGuardState, "", window.location.href);

    const handlePopState = () => {
      if (dialogOpenRef.current) return;
      window.history.pushState(nextGuardState, "", window.location.href);
      dialogOpenRef.current = true;
      setIsDialogOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname, status]);

  const handleCancel = () => {
    dialogOpenRef.current = false;
    window.history.pushState({ backGuard: true, path: pathname }, "", window.location.href);
    setIsDialogOpen(false);
  };

  const handleConfirm = () => {
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
