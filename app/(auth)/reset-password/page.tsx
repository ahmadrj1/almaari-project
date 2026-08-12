import ResetPasswordPage from "./reset-password-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | Almaari",
  description: "Enter your new password to reset your Almaari account.",
};

export default function Page() {
  return <ResetPasswordPage />;
}
