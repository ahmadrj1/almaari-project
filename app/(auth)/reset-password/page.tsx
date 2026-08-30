import ResetPasswordPage from "./reset-password-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reset Password | ${APP_NAME}`,
  description: `Enter your new password to reset your ${APP_NAME} account.`,
};

export default function Page() {
  return <ResetPasswordPage />;
}
