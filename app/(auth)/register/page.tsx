import RegisterPage from "./register-client";
import { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Register | ${APP_NAME}`,
  description: `Create a new ${APP_NAME} account and start shopping today.`,
};

export default function Page() {
  return <RegisterPage />;
}
