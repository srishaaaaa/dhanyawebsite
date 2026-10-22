"use server";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(_: string | null, formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      otp: String(formData.get("otp") ?? ""),
      redirectTo: "/admin",
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      if (code === "mfa_required") return "Enter the 6-digit code from your authenticator app.";
      if (code === "mfa_invalid") return "That authenticator code isn't valid (or was already used). Wait for the next code and try again.";
      return "Invalid credentials, or too many attempts. Try again in 15 minutes.";
    }
    throw e; // lets the redirect through
  }
}
