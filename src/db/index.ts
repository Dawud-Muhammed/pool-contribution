import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const getConnectionString = () => {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("<") || url.includes(">")) {
    return "postgresql://placeholder:placeholder@placeholder.neon.tech/neondb?sslmode=require";
  }
  return url;
};

const sql = neon(getConnectionString());
export const db = drizzle(sql, { schema });
