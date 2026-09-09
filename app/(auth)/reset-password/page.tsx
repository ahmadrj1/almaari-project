import ResetPasswordPage from "./reset-password-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: `Reset Password | ${APP_NAME}`,
  description: `Enter your new password to reset your ${APP_NAME} account.`,
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (token) {
    redirect(`/api/auth/verify-reset?token=${encodeURIComponent(token)}`);
  }

  const cookieStore = await cookies();
  const resetSession = cookieStore.get("reset_session")?.value;

  if (!resetSession) {
    redirect("/reset-link-expired");
  }

  return <ResetPasswordPage />;
}
