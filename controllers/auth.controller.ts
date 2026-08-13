import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AuthService } from "@/services/auth.service";
import { handleApiError, AppError } from "@/lib/api-error";
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

export class AuthController {
  static async register(req: Request) {
    try {
      const body = await req.json();
      const validatedData = registerSchema.safeParse(body);
      
      if (!validatedData.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Validation failed", 
            details: validatedData.error.flatten().fieldErrors 
          },
          { status: 400 }
        );
      }

      const message = await AuthService.register(validatedData.data);
      return NextResponse.json({ success: true, message }, { status: 201 });
    } catch (error) {
      return handleApiError(error, "AuthController.register");
    }
  }

  static async forgotPassword(req: Request) {
    try {
      const body = await req.json();
      const result = forgotPasswordSchema.safeParse(body);
  
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "Invalid data", details: result.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const message = await AuthService.forgotPassword(result.data.email);
      return NextResponse.json({ success: true, message });
    } catch (error) {
      return handleApiError(error, "AuthController.forgotPassword");
    }
  }

  static async verifyResetToken(req: Request) {
    try {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        return NextResponse.redirect(new URL("/login?error=Reset token is missing or invalid.", req.url));
      }

      await AuthService.verifyResetToken(token);

      const cookieStore = await cookies();
      cookieStore.set("reset_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600, // 1 hour
      });

      return NextResponse.redirect(new URL("/reset-password", req.url));
    } catch (error) {
      logger.error({ err: error }, "Verify reset token error");
      return NextResponse.redirect(new URL("/login?error=Reset password token is mismatched, wrong or expired.", req.url));
    }
  }

  static async resetPassword(req: Request) {
    try {
      const body = await req.json();
      const result = resetPasswordSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "Invalid data", details: result.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const cookieStore = await cookies();
      const token = cookieStore.get("reset_session")?.value;

      if (!token) {
        throw new AppError("No active password reset session.", 401);
      }

      const message = await AuthService.resetPassword(token, result.data.password);
      
      cookieStore.delete("reset_session");
      return NextResponse.json({ success: true, message });
    } catch (error) {
      return handleApiError(error, "AuthController.resetPassword");
    }
  }
}
