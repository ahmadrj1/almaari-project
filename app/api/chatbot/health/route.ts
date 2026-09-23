import { NextResponse } from "next/server";
import { CHATBOT_NAME } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({ status: "ok", online: true, name: CHATBOT_NAME });
}
