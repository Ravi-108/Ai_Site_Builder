import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js"; // Make sure this path is correct for your project

// const TRUSTED_ORIGINS = process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(",") : [];
const TRUSTED_ORIGINS = ['https://ai-site-builder-pi.vercel.app', 'http://localhost:5173', 'localhost:5173'];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  user: {
    deleteUser: { enabled: true },
    // NEW: Exposing the credits column from Neon DB to your frontend!
    additionalFields: {
      credits: {
        type: "number",
        returned: true
      }
    }
  },

  trustedOrigins: TRUSTED_ORIGINS,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  // baseURL: "http://localhost:5173",
  secret: process.env.BETTER_AUTH_SECRET!,

  advanced: {
    cookies: {
      session_token: {
        name: 'auth_session',
        attributes: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/',
        }
      }
    }
  }
});
