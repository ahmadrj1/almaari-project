import EditProductClient from "./edit-product-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: Props) {
  return <EditProductClient params={params} />;
}
