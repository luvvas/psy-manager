// dotenv is loaded by the entry point (src/index.ts) before this module
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For query purposes — connection pool
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
