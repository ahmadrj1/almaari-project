import ForgotPasswordPage from "./forgot-password-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | Almaari",
  description: "Request a password reset link for your Almaari account.",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
