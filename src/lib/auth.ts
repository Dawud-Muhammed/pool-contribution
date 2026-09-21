import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

const authSecret = process.env.BETTER_AUTH_SECRET;
const authBaseURL = process.env.BETTER_AUTH_URL;

if (process.env.NODE_ENV === "production" && (!authSecret || !authBaseURL)) {
  throw new Error("BETTER_AUTH_SECRET and BETTER_AUTH_URL are required in production.");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: authSecret || "local-development-secret-change-me",
  baseURL: authBaseURL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
});
