import ResetLinkExpiredClient from "./reset-link-expired-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reset Link Expired | ${APP_NAME}`,
  description: `The requested password reset link has expired or is invalid on ${APP_NAME}.`,
};

export default function Page() {
  return <ResetLinkExpiredClient />;
}
