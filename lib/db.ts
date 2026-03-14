import { Pool, PoolClient } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let initPromise: Promise<void> | null = null;
let isInitialized = false;

export async function rawGetClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function rawQuery(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

export async function ensureDatabaseInitialized(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const { initDatabase } = await import("./init-db");
      await initDatabase();
      isInitialized = true;
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}

void ensureDatabaseInitialized().catch((error) => {
  console.error("Automatic database initialization failed:", error);
});

// Get a client from the pool
export async function getClient(): Promise<PoolClient> {
  await ensureDatabaseInitialized();
  return rawGetClient();
}

// Execute a query directly from the pool
export async function query(text: string, params?: unknown[]) {
  await ensureDatabaseInitialized();
  return rawQuery(text, params);
}

// Execute a query with a specific client (for transactions)
export function queryWithClient(
  client: PoolClient,
  text: string,
  params?: unknown[],
) {
  return client.query(text, params);
}

export default pool;
