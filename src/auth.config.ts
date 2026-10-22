import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Node crypto / DB). Used by middleware for UX redirects ONLY.
// Real authorization happens server-side in requireStaff() against the database.
export const authConfig = {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const p = request.nextUrl.pathname;
      if (p.startsWith("/admin") && p !== "/admin/login" && p !== "/admin/unauthorized") return !!auth?.user;
      return true;
    },
    jwt({ token, user }) { if (user?.id) token.sub = user.id; return token; },
    session({ session, token }) { if (token.sub) session.user.id = token.sub; return session; },
  },
} satisfies NextAuthConfig;
