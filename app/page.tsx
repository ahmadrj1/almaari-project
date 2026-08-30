import HomePage from "./client-page";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: `Home | ${APP_NAME}`,
  description: `Browse and buy products from our wide collection on ${APP_NAME}.`,
};

export default function Page() {
  return (
    <Suspense
      fallback={<div className="flex justify-center p-8">Loading...</div>}
    >
      <HomePage />
    </Suspense>
  );
}
