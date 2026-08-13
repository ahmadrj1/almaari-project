import LoginPage from "./login-client";
import { Metadata } from "next";
import { APP_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Login | ${APP_NAME}`,
  description: `Log in to your ${APP_NAME} account to shop and manage your orders.`,
};

import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8">Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
