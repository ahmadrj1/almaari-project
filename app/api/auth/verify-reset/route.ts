import { AuthController } from "@/controllers/auth.controller";

export async function GET(req: Request) {
  return AuthController.verifyResetToken(req);
}
