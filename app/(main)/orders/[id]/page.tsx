import OrderDetailsPage from "./order-details-client";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order #${id.slice(0, 8).toUpperCase()} | Almaari`,
    description: `View details for order #${id} on Almaari.`,
  };
}

export default function Page() {
  return <OrderDetailsPage />;
}
