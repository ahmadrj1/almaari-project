import { getServerSessionSnapshot } from "@/lib/auth-session";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSessionSnapshot();
  if (session?.user?.role === Role.ADMIN) {
    redirect("/admin/products");
  }

  return <>{children}</>;
}
