import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js"; // Make sure this path is correct for your project

const TRUSTED_ORIGINS = process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(",") : [];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", 
  }),

  emailAndPassword: { 
    enabled: true, 
  },
  user: {
    deleteUser: {enabled: true}
  },
  
  trustedOrigins: TRUSTED_ORIGINS, // Fixed: Mapped the lowercase key to your uppercase variable
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET!,
  
  advanced: {
    cookies: {
      session_token: { // Fixed: Changed 'Session_token' to 'session_token'
        name: 'auth_session',
        attributes: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          // Fixed: 'none' requires HTTPS. Localhost needs 'lax'.
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
          path: '/',
        }
      }
    }
  } // Fixed: Added the missing closing bracket here!
});