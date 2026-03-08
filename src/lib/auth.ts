/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — NextAuth Configuration (MongoDB-backed)
 * ─────────────────────────────────────────────────────────
 * Google OAuth provider with MongoDB user persistence.
 * On sign-in, upserts user document. Attaches DB userId
 * and role to the JWT + session for downstream use.
 */

import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/backend/config";
import { User } from "@/backend/models";

const isDev = process.env.NODE_ENV === "development";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    // ── Dev-only: skip OAuth for local testing ──
    ...(isDev
      ? [
          CredentialsProvider({
            id: "dev-login",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email", placeholder: "dev@solar-intel.local" },
            },
            async authorize(credentials) {
              // Accept any email in dev mode — no password needed
              const email = credentials?.email || "dev@solar-intel.local";
              return {
                id: "dev-user-001",
                name: "Dev Admin",
                email,
                image: "",
              };
            },
          }),
        ]
      : []),
  ],

  pages: {
    signIn: "/auth/signin",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    /**
     * signIn — runs once at sign-in.
     * Upserts user AND attaches dbUserId/role directly to the
     * account object so the jwt callback never needs a DB call.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile) {
        try {
          await connectDB();

          const dbUser = await User.findOneAndUpdate(
            { googleId: profile.sub },
            {
              $set: {
                name: user.name || profile.name || "",
                email: user.email || (profile as { email?: string }).email || "",
                image: user.image || "",
                googleId: profile.sub,
              },
              $setOnInsert: {
                role: "admin",
                accountId: `EESL-${Date.now().toString(36).toUpperCase()}`,
                plan: "premium",
                planCost: 2999,
                nextRenewal: "15 April, 2026",
                notifications: {
                  email: true,
                  sms: true,
                  push: true,
                  criticalAlerts: true,
                  weeklyReport: true,
                  maintenanceReminders: true,
                },
              },
            },
            { upsert: true, new: true }
          ).lean();

          // Stash on account so jwt() can read without a DB round-trip
          if (dbUser && account) {
            (account as Record<string, unknown>).dbUserId = dbUser._id.toString();
            (account as Record<string, unknown>).dbRole = dbUser.role;
          }
        } catch (err) {
          console.error("❌ Error upserting user:", err);
        }
      }
      return true;
    },

    /**
     * jwt — called on every session check.
     * Only hits DB on the very first sign-in (account present),
     * afterwards reads cached values from the JWT — zero DB calls.
     */
    async jwt({ token, account, user }) {
      if (account?.provider === "google") {
        // First sign-in: account carries the values stashed in signIn()
        token.dbUserId = (account as Record<string, unknown>).dbUserId as string || token.sub || "";
        token.role    = (account as Record<string, unknown>).dbRole as string   || "operator";
      }
      if (account?.provider === "dev-login" && user) {
        // Dev login — no DB involved, just set admin role
        token.dbUserId = user.id || "dev-user-001";
        token.role = "admin";
      }
      // Subsequent requests: token already has dbUserId + role — no DB hit
      return token;
    },

    /**
     * session — purely in-memory mapping from JWT to session object.
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id     = (token.dbUserId as string) || token.sub || "";
        (session.user as { role?: string }).role = (token.role as string)     || "operator";
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
