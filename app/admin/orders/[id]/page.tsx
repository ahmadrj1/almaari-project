import AdminOrderDetailsClient from "./admin-order-details-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: Props) {
  return <AdminOrderDetailsClient params={params} />;
}
