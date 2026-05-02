import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  /** Make sure your client-side .env file has VITE_BASEURL="http://localhost:3000" */
  baseURL: import.meta.env.VITE_BASEURL,
  fetchOptions: {
    credentials: 'include', // Perfect! This makes sure cookies are sent back and forth.
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;