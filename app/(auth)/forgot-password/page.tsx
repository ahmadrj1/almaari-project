import ForgotPasswordPage from "./forgot-password-client";
import { Metadata } from "next";
import { APP_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Forgot Password | ${APP_NAME}`,
  description: `Request a password reset link for your ${APP_NAME} account.`,
};

export default function Page() {
  return <ForgotPasswordPage />;
}
