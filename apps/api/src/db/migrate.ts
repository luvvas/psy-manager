import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "path";

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL environment variable is missing.");
        process.exit(1);
    }

    console.log("🚀 Initializing migration database connection...");
    // Note: Migrations require max 1 connection
    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    const migrationsPath = path.join(__dirname, "../../drizzle");
    console.log(`📂 Looking for migrations in: ${migrationsPath}`);

    try {
        console.log("⏳ Applying pending migrations to database...");
        await migrate(db, { migrationsFolder: migrationsPath });
        console.log("✅ All migrations applied successfully!");
    } catch (err) {
        console.error("❌ Migration failed with error:");
        console.error(err);
        process.exit(1);
    } finally {
        await migrationClient.end();
    }
}

main();
