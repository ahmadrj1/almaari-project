import PaymentFailedClient from "./payment-failed-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: `Payment Failed | ${APP_NAME}`,
  description: `Payment processing status and assistance for your order on ${APP_NAME}.`,
};

interface PageProps {
  searchParams: Promise<{ orderId?: string; error?: string }>;
}

export default function Page(props: PageProps) {
  return (
    <Suspense
      fallback={<div className="flex justify-center p-8">Loading...</div>}
    >
      <PaymentFailedClient searchParams={props.searchParams} />
    </Suspense>
  );
}
