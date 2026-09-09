import PaymentSuccessClient from "./payment-success-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: `Payment Successful | ${APP_NAME}`,
  description: `Thank you for your order on ${APP_NAME}. Your payment has been successfully processed.`,
};

interface PageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default function Page(props: PageProps) {
  return (
    <Suspense
      fallback={<div className="flex justify-center p-8">Loading...</div>}
    >
      <PaymentSuccessClient searchParams={props.searchParams} />
    </Suspense>
  );
}
